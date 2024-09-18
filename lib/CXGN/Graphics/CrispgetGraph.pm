
package CXGN::Graphics::CrispgetGraph;

use Moose;
# use GD::Image;
use Data::Dumper;
use Bio::SeqIO;
use Bio::BLAST::Database;
use File::Temp qw | tempfile |; 

# get all arguments from Crispget.pm (Ajax controllers), subroutine view
has 'result_file' => ( is=>'rw' );
has 'align_tool' => (is => 'rw', isa=>'Str', default=>"Bowtie");
has 'guides' => (is=>'rw', isa=>'Ref');
has 'guide_length' => (is => 'rw', isa=>'Int', default=>23);
has 'cfd_mm_score' => (is=>'rw', isa=>'Ref');
has 'cfd_pam_score' => (is=>'rw', isa=>'Ref');
has 'mit_mm_score' => (is=>'rw', isa=>'Ref');

has 'line_length' => (is => 'rw', isa=>'Int', default=>10);

sub create_cfd_score {
	my $self = shift;
	my $basename = shift; 
	my %cfd_mm_score; 
	my %cfd_pam_score; 
	my $file_name_mm;
	my $file_name_pam;
	
	
	$file_name_mm= "cfd.mm.scores.cas9.txt"; 
	$file_name_pam= "cfd.pam.scores.cas9.txt"; 

	my $file_path_mm = File::Spec->catfile($basename, $file_name_mm); 
	my $file_path_pam = File::Spec->catfile($basename, $file_name_pam); 

	#20bp mismatches score
	
	open my $file_mm,"<", $file_path_mm or die "Failed to open $file_path_mm \n";

	while(my $line = <$file_mm>) {
		chomp $line;
		my @parts = split(" ",$line);
		my $position = $parts[0];
		my $score = $parts[1]; 
		$cfd_mm_score{$position} = $score;  
	}
	close $file_mm or die "Failed to close $file_path_mm: $!\n";

	# PAM score
	open my $file_pam,"<", $file_path_pam or die "Failed to open $file_path_pam \n";
	while(my $line = <$file_pam>) {
		chomp $line;
		my @parts = split(" ",$line);
		my $position = $parts[0];
		my $score = $parts[1]; 
		$cfd_pam_score{$position} = $score;  
	}
	close $file_pam or die "Failed to close $file_path_pam: $!\n";


	$self->cfd_mm_score(\%cfd_mm_score);
	$self->cfd_pam_score(\%cfd_pam_score);

}


sub create_mit_score {
	my $self = shift;

	my $basename = shift; 
	my %mit_mm_score; 

	my $file_name_mm;

	
	$file_name_mm= "mit.weights.txt"; 
	my $file_path_mm = File::Spec->catfile($basename, $file_name_mm); 

	#20bp mismatches score
	
	open my $file_mm,"<", $file_path_mm or die "Failed to open $file_path_mm \n";

	while(my $line = <$file_mm>) {
		chomp $line;
		my @parts = split(" ",$line);

		my $position = $parts[0];
		my $score = $parts[1]; 
		$mit_mm_score{$position} = $score;  
	}
	close $file_mm or die "Failed to close $file_path_mm: $!\n";
	$self->mit_mm_score(\%mit_mm_score);
}




# Parse Bowtie file to filter the hits under the number of mismatches selected
sub parse { 
	my $self = shift;
	my $mm = shift || 0;
	my $bdb_full_name = shift;
	my $temp_dir = shift;
	my $ref_gen_ext = shift; 


	print STDERR ( "HEYYY MY length ref context: $ref_gen_ext"); 

	
	print STDERR $self->result_file(); 

	open(my $result_fh, "<", $self->result_file()) || die "Can't open file ".$self->result_file();

	my $matches = {};

	my $guides=[]; 

	# parse Bowtie file
	my $start_coord = -1; 
	my $end_coord = -1;
	my $guide; 
	my $i =1;
	my @lines=(0); 
	my $j = 0; 
	while (my $line = <$result_fh>) { 
		#print STDERR "My lineeee $line\n"; 
		my @line_list = (split /\t/, $line);
		my ($seq_id, $code, $subject, $scoord,$guide_sequence) = ($line_list[0],$line_list[1],$line_list[2],$line_list[3],$line_list[9]);
		#print STDERR "seq id $seq_id , code $code, subject $subject, scoord $scoord \n"; 
		#print STDERR $line	 =~ /XM:i:(\d+)/; 


		#if ($line =~ /NM:i:(\d+)/) { # edit distance for Bowtie
		my @tmp_mm_found_list; 
		@tmp_mm_found_list = $line =~ /XM:i:(\d+)/;# number of mismatches for Bowtie2
		my $mm_found;# mm_found=0 is the same as perfect matches
		if (@tmp_mm_found_list){
			$mm_found =@tmp_mm_found_list[0];
		}else{
			$mm_found=-1;
			}#This conditional avoids the problem of having undefined mm_found
			

		if (($mm_found>=0) && ($mm_found <= $mm)) {
			#print STDERR "Seq id, $seq_id Number of mismatches $mm_found, expected max $mm guide sequence $guide_sequence \n"; 
			#print STDERR " Has the mismatches";
			# save match coordinates
			if ($seq_id=~/(\d+)/)  {##Search start_coord with the temporal name assigned to the fragments size
			#That start_coord is into the input sequence (NO reference)
			#print STDERR " Has format tmp_number ";
			
				if ($start_coord!=$1){
					#print STDERR "Start coord diff from actual tmp_number" ;
					
					if ($guide){
						print $guide; 
					#print STDERR "There is a guide" ;
					
					# Save guide object in guides hash
					push @{$guides}, $guide;
					#Update guide id
					$i+=1;
					}
					#print STDERR "There is no guide, line tmp: $seq_id";
					#print STDERR "NNNNNN";

					$guide = CXGN::Graphics::CrispgetGraph::Guide->new();
					#The /../ in a list context returns the values between ()
					#In $ context returns 1, 0, so I need a temporal list then just get the first match
					my @temp_start_list; 
					@temp_start_list = $seq_id=~/(\d+)/;
					
					$start_coord = $temp_start_list[0]; 
					$end_coord = $start_coord+length($guide_sequence)-1;

					$guide->start_guide($start_coord);
					$guide->end_guide($end_coord);
					$guide->sequence($guide_sequence);
					$guide->MIT_score(20);
					$guide->CFD_score(80);

					my $i= 0; 

					foreach my $l (@lines){

						
						$i+=1; 
						if ($start_coord >$l){
							$guide ->line($i-1); 
							$lines[$i-1]=$end_coord;
							last; 
						}
					}

					if ($guide->line ==-1){

						
						push(@lines,$end_coord);
						$guide->line(scalar(@lines)-1);
						
					}
					#print STDERR " start coord $start_coord END COORD $end_coord My lineeeee".$guide->line."\n"; 
					

					

				
					#print STDERR "My guide internal seq".$guide->sequence. "start_guide $start_coord, end_guide $end_coord"; 

				}else{
					if ($guide->sequence eq "*"){
						$guide->sequence($guide_sequence);
					}

				}

				print STDERR "My guide $guide number ".$guide->start_guide."And alignment ref coord $scoord"."And sequence".$guide->sequence;
				
				#print STDERR "My guide seq afteeeer".$guide->offtargets->@*; 
				# create new off_target sequence object ( relative to the )
				my $off_target = CXGN::Graphics::CrispgetGraph::OffTarget->new();
				$off_target->start($scoord);#TO DO
				$off_target->end($scoord+length($guide->sequence)-1);#TO DO
				$off_target->id($subject);#Name in whole genome where off_target is found
				

				
				################### Reference geneome context ##########################

				print STDERR ("The database in CRISPGET GRAPH is $bdb_full_name .....\n");
				my @blast_command  = ();
				#get complete genome ( as -fa file)
				my $ref_genome = `blastdbcmd -db $bdb_full_name -entry \"$subject\"` ; 

				#Create temp file to save ref genome (just the $subject)
				my ($seq_fh, $seq_filename) = tempfile("ref_genomeXXXXXX", DIR=> $temp_dir,);
				print $seq_fh $ref_genome;
				close($seq_fh) or "Couldn't close the file"; 
				
				my $io = Bio::SeqIO->new(-format=>'fasta', -file=>$seq_filename); 
				my $seq_io = $io->next_seq()->seq(); 
				print STDERR "$j Subject length: ".length($seq_io); 	
				$j+=1; 

				my $refStart =0; 
				my $refEnd = 0; 

				my $guideStartref = 0; 

				
				if ($scoord>$ref_gen_ext){
					$refStart=$scoord-$ref_gen_ext-1;
					$guideStartref = $ref_gen_ext;
					
				}else{
					$refStart = 0; 
					$guideStartref = $scoord-1; 
				}

				if (($scoord+length($guide_sequence)-1)<(length($seq_io)-1-$ref_gen_ext)){
					$refEnd=$scoord+length($guide->sequence)-1+$ref_gen_ext
					
				}else{
					$refEnd=length($seq_io)-1; 
				}

				my $context_ref_genome = substr($seq_io,$refStart, $refEnd-$refStart);  

				print STDERR "Ref start:$refStart ref end: $refEnd\n ...:**********".$guide->sequence."\n ...:$context_ref_genome";

				$off_target->ref_gen($context_ref_genome);
				$off_target->ref_gen_start($guideStartref+0); 
				$off_target->ref_gen_end($guideStartref+length($guide->sequence)-1); 
				$off_target->CFD_score(get_off_target_CFD_score($self, $context_ref_genome,$guideStartref,$guide_sequence));
				print STDERR "Hey I have CFD score"; 
				$off_target->MIT_score(get_off_target_MIT_score($self, $context_ref_genome,$guideStartref,$guide_sequence));
				print STDERR "Hey I have MIT score"; 

						
				
				
				#print STDERR "\n The length of the offtarget list before:". length(@{$guide->offtargets})."\n"; 
				push $guide->offtargets->@*,$off_target;
				
				#print STDERR "My guide $guide number ".$guide->start_guide."The length of the offtarget list after:".scalar(@{$guide->offtargets})."\n"; 
				
				#print STDERR "I have the offtarget with start: ".$off_target->start." end: ".$off_target->end; 
				#print STDERR "I added the offtarget"; 


				#$off_target->CFD_score(get_CFD_score());
			}

		}
	
	}
	print STDERR "Heeey my lines ".scalar(@lines);
	$self->guides($guides);
	$self->line_length(scalar(@lines));
}

sub get_off_target_CFD_score {
	my $self = shift;
	my $context_ref_genome = shift;
	my $ref_gen_ext = shift;
	my $guide_sequence = shift;

	my $key_value; 
	my $char_guide; 
	my $char_ref_genome;

	my $score =1;  
	my $j; 

	for my $i (0..length($guide_sequence)-1-3){
		$char_guide = substr($guide_sequence, $i, 1);
		$char_ref_genome = substr($context_ref_genome, $ref_gen_ext+$i, 1);
		$j = $i+1; 

		$key_value = "".$char_guide.$char_ref_genome.$j;
		print STDERR "Key value : $key_value, Position: $i \n";  
		if ($char_guide ne $char_ref_genome){
			if (exists $self->cfd_mm_score->{$key_value} ){
			$score *= $self->cfd_mm_score->{$key_value}; 
			print STDERR "Heeey I did a mismatch score"; 
			}
		}
		 
	}
	#Pam score
	my $pam = substr($guide_sequence,-2, 2); 

	print STDERR "My PAM score".$self->cfd_pam_score->{$pam};
	if (exists $self->cfd_pam_score->{$pam} ){
		$score *= $self->cfd_pam_score->{$pam}; 
		print STDERR "Heeey I did the pam score"; 
	}

	$score= $score*100; 

	return $score; 

}

sub get_off_target_MIT_score {
	my $self = shift;
	my $context_ref_genome = shift;
	my $ref_gen_ext = shift;
	my $guide_sequence = shift;

	my $key_value; 
	my $char_guide; 
	my $char_ref_genome;

	my $score =1;  
	my $j; 
	my @mm_pos; 
	#Part 1- Product operator with weight based on position
	for my $i (0..length($guide_sequence)-1-3){
		$char_guide = substr($guide_sequence, $i, 1);
		$char_ref_genome = substr($context_ref_genome, $ref_gen_ext+$i, 1);


		$j = $i+1; 
		
		if ($char_guide ne $char_ref_genome){#If there is a mismatch
			#Add to mm list 
			push(@mm_pos,$j); 

			if (exists $self->mit_mm_score->{$j} ){ #Assert it is in the desired length
			$score *= $self->mit_mm_score->{$j}; 
			print STDERR "Heeey I did a mismatch score weight"; 
			}
		}
		
	}
	print STDERR "First MIT done";
	#Part 2 1/(((length-1-d)/length-1)*4+1)

	my $max_dist = scalar($guide_sequence); 
	my $d; 
	my $mm_num = scalar(@mm_pos); 
	if ($mm_num >2){
		$d = @mm_pos[-1]-@mm_pos[0]; 

		$score*=1/(((($max_dist-$d)/($max_dist))*4)+1); 
	}
	print STDERR "Second MIT done";

	#Part 3 
	if ($mm_num !=0){
		$score *= 1/($mm_num*$mm_num); 
	}
	
	$score= $score*100; 
	print STDERR "Third MIT done";

	return $score; 

}


sub get_CFD_score {
	my $self = shift;
	my $j=0; 
	foreach my $g (@{$self->guides}){

		print STDERR "My guide $g ";
		print STDERR "MIT score".$g->MIT_score." CFD score ".$g->CFD_score." Start guide ".$g->start_guide." end guide ".$g->end_guide."\n";


		#print STDERR "j: $j sequence".@{$guides->{$i}}[0]->sequence." MIT_score ".@{$guides->{$i}}[0]->MIT_score." CFD_score ".@{$guides->{$i}}[0]->CFD_score;
		#print STDERR " start_guide ".@{$guides->{$i}}[0]->start_guide." end_guide ".@{$guides->{$i}}[0]->end_guide."\n";
		my $sum_cfd_score = 0; 
		foreach my $off_target (@{$g->offtargets}){
			$sum_cfd_score += $off_target->CFD_score; 
			print STDERR ".................".$off_target->start."\n";
		}

		my $normalized_cfd_score = (100.0*100)/$sum_cfd_score; 
		$g->CFD_score($normalized_cfd_score); 
		#print STDERR "j: $j guide ".@{$guides->{$i}}[0]->start_guide." offtargets list size:".scalar()."\n";

		#print STDERR length(@{$guides->{$i}});
		$j+=1;  
		print STDERR "My CFD guide scoooooore: ".$g->CFD_score; 
	}
}

sub get_MIT_score {
	my $self = shift;
	my $j=0; 
	foreach my $g (@{$self->guides}){

		print STDERR "My guide $g ";
		print STDERR "MIT score".$g->MIT_score." CFD score ".$g->CFD_score." Start guide ".$g->start_guide." end guide ".$g->end_guide."\n";


		#print STDERR "j: $j sequence".@{$guides->{$i}}[0]->sequence." MIT_score ".@{$guides->{$i}}[0]->MIT_score." CFD_score ".@{$guides->{$i}}[0]->CFD_score;
		#print STDERR " start_guide ".@{$guides->{$i}}[0]->start_guide." end_guide ".@{$guides->{$i}}[0]->end_guide."\n";
		my $sum_mit_score = 0; 
		foreach my $off_target (@{$g->offtargets}){
			$sum_mit_score += $off_target->MIT_score; 
			print STDERR ".................".$off_target->start."\n";
		}

		my $normalized_mit_score = (100.0)/(100+$sum_mit_score); 
		$g->MIT_score($normalized_mit_score*100); 
		#print STDERR "j: $j guide ".@{$guides->{$i}}[0]->start_guide." offtargets list size:".scalar()."\n";

		#print STDERR length(@{$guides->{$i}});
		$j+=1;  
		print STDERR "My MIT guide scoooooore: ".$g->MIT_score; 
	}
}

sub sort_keys { 
    $b->[1] <=> $a->[1];
}



package CXGN::Graphics::CrispgetGraph::OffTarget;

use Moose;

has 'start' => (is => 'rw', isa=>'Int');
has 'end'   => (is => 'rw', isa=>'Int');
has 'id'    => (is => 'rw');

has 'ref_gen' => (is => 'rw', isa=>'Str');
has 'CFD_score' => (is => 'rw',default=>0);
has 'MIT_score' => (is => 'rw',default=>0);
has 'ref_gen_start' => (is => 'rw', isa=>'Int');
has 'ref_gen_end' => (is => 'rw', isa=>'Int');


package CXGN::Graphics::CrispgetGraph::Guide;

use Moose;

has 'offtargets' => (is => 'rw', isa=>'ArrayRef[CXGN::Graphics::CrispgetGraph::OffTarget]',default => sub { [] });

has 'MIT_score'   => (is => 'rw', isa=>'Num',default=>-15);
has 'CFD_score'    => (is => 'rw',isa=>'Num',default=>0);

has 'start_guide'   => (is => 'rw', isa=>'Int',default=>0);
has 'end_guide'   => (is => 'rw', isa=>'Int',,default=>0);

has 'line' => (is => 'rw', isa=>'Int',,default=>-1);

has 'sequence' => (is => 'rw', isa=>'Str');



	
1;
