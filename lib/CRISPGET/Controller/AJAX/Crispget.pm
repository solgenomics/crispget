
package CRISPGET::Controller::AJAX::Crispget;

use Moose;

use File::Basename;
use File::Slurp;
use File::Spec;

use Bio::Seq;
use Bio::SeqIO;
use Bio::BLAST::Database;
use Data::Dumper;
use File::Temp qw | tempfile |; 
use CXGN::Graphics::CrispgetGraph;
use JSON; 
BEGIN { extends 'Catalyst::Controller::REST' }

__PACKAGE__->config(
    default => 'application/json',
    stash_key => 'rest',
    map => { 'application/json' => 'JSON', 'text/html' => 'JSON' },
   );

our %urlencode;

# check input data, create Bowtie2 input data and run Bowtie2
sub run_bowtie2 :Path('/crispget/result') :Args(0) { 
    my ($self, $c) = @_;
    
    # to store errors as they happen
    my @errors; 
 
    # get variables from catalyst object
    my $params = $c->req->body_params();
    
    #Input sequence
    my $sequence = $c->req->param("sequence")||"Empty Sequence";
    #Guide length based on guide structure
    my $guide_length= $c->req->param("guide_length");   
    #Mismatches
    my $mismatch = $c->req->param("mismatch");
    #Guide structure (20bp-NGG)
    my $guide = $c->req->param("guide");  
    #Align tool (Now is just bowtie)
    my $align_tool = $c->req->param("align_tool"); 
    #Database
    my $db_id = $c->req->param("database"); #Will be the reference genome

    my $db_folder  = $db_id; 
    $db_folder =~ s|(.+)_|$1/|;

    ####print STDERR ("Hey this is my databasse path!". $db_folder); 
    ####print STDERR "Size guide $guide_length"; 
    
    ##my $guide_length = $c->req->param("guide_length");

    
	
	###print STDERR "seq: $sequence\n";
	
    # clean the sequence and check if there are more than one sequence pasted
    if ($sequence =~ tr/>/>/ > 1) {
		push ( @errors , "Please, paste only one sequence.\n");	
    }
    my $id = "pasted_sequence";
    my @seq = [];

    if ($sequence =~ /^>/) {
		$sequence =~ s/[ \,\-\.\#\(\)\%\'\"\[\]\{\}\:\;\=\+\\\/]/_/gi;
		@seq = split(/\s/,$sequence);

		if ($seq[0] =~ />(\S+)/) {
		    shift(@seq);
		    $id = $1;
		}
		$sequence = join("",@seq);
    } elsif ($sequence =~ tr/acgtACGT/acgtACGT/ < 30) {#When just a gene name is pasted
		
		# save pasted gene name
		my $pasted_gene_name = $sequence;
		$sequence =~ s/\.\d//;
		$sequence =~ s/\.\d//;
		
		# get databases path from the configuration file
		my $db_path = $c->config->{crispget_db_path};
    ###print STDERR "The db_path".$db_path."\n"; 
			
		# get database names from their path
		# my @tmp_dbs = glob("$db_path/*.rev.1.bt2");
		my @tmp_dbs = glob("$db_path/*.rev.1.ebwt");

    ###print STDERR "The tmp_dbs".@tmp_dbs."\n"; 
		
		# find the pasted gene name in the BLAST dbs and leave the loop when the name is found
		foreach my $db_path (@tmp_dbs) {
			# $db_path =~ s/\.rev\.1\.bt2//;
			$db_path =~ s/\.rev\.1\.ebwt//;
			###print STDERR "DB: $db_path\n";
			
			my $fs = Bio::BLAST::Database->open(full_file_basename => "$db_path",);
			
			if ($fs->get_sequence($sequence)) {
				my $seq_obj = $fs->get_sequence($sequence);
				$sequence = $seq_obj->seq();
				last;
			}
		}
		
		if ($sequence =~ tr/acgtACGT/acgtACGT/ < 30) {
			push ( @errors , "Your input sequence is not valid: $pasted_gene_name\n");
		}
		
    } else {
		$sequence =~ s/[^ACGT]+//gi;
    }

  # Check input sequence and fragment size    
  if (length($sequence) < 40) { 
  push ( @errors , "You should paste a valid sequence (100 bp or longer) in the CRISPGET Tool Sequence window.\n");	
  }
  elsif ($sequence =~ /([^ACGT]+)/i) {
  push (@errors, "Unexpected characters found in the sequence: $1\n");	
  }
  elsif (length($sequence) < $guide_length) {
  push (@errors, "n-mer size must be lower or equal to sequence length.\n");
  }
  
  #Mismatch check 
  if ($mismatch =~ /[^\d]/ || $mismatch < 0 || $mismatch > 2 ) { 
    if ($align_tool eq "Bowtie"){
      push (@errors, "miss-match value ($mismatch) must be between 0-2 for bowtie 2 search\n");
    }
  }

    # Send error message to the web if something is wrong
	if (scalar (@errors) > 0){
		my $user_errors = join("<br />", @errors);
		$c->stash->{rest} = {error => $user_errors};
		return;
	}


  ######### BOWTIE2 Analysis ###############
	
	# generate temporary file name for analysis with Bowtie2.
	my ($seq_fh, $seq_filename) = tempfile("crispgetXXXXXX", DIR=> $c->config->{'cluster_shared_tempdir'},);
  ###print STDERR" Sequence filename $seq_filename \n"; 
    # Lets create the fragment fasta file
    #Input sequence: 
    my $query = Bio::Seq->new(-seq=>$sequence, -id=> $id || "temp");

    my $io = Bio::SeqIO->new(-format=>'fasta', -file=>">".$seq_filename.".fragments");  
    my $selected_sequences_io = Bio::SeqIO->new(-format=>'fasta', -file=>">".$seq_filename."_pam.fragments"); 

    foreach my $i (1..$query->length()-$guide_length) { 
      my $subseq = $query->subseq($i, $i + $guide_length -1);
      my $subseq_obj = Bio::Seq->new(-seq=>$subseq, -display_id=>"tmp_$i");
      #Select the guides 
      if ($guide eq "20bp-NGG" && (uc(substr($subseq_obj->seq(),-2)) eq ("GG"))){
        my $result = $selected_sequences_io->write_seq($subseq_obj);
        ###print STDERR $i." ".$result." ".$subseq_obj->seq()."\n"; 
      }
      
      $io->write_seq($subseq_obj);
    }

    $c->stash->{query} = $query;
    $io->close();
    $selected_sequences_io->close(); 


    # Lets create the query fasta file - This is the complete sequence 
    my $query_file = $seq_filename;
    my $seq = Bio::Seq->new(-seq=>$sequence, -id=> $id || "temp");
    $io = Bio::SeqIO->new(-format=>'fasta', -file=>">".$query_file);
    
    $io->write_seq($seq);
    $io->close();

    if (! -e $query_file) { die "Query file failed to be created."; }


    #Create the query fasta file for the ones I selected

    #my $query_file_pam = $seq_filename."_pam";
    #my $seq_pam = Bio::Seq->new(-seq=>$sequence, -id=> $id || "temp");
    #$selected_sequences_io = Bio::SeqIO->new(-format=>'fasta', -file=>">".$query_file_pam);
    #$selected_sequences_io->write_seq($seq_pam);
    #$selected_sequences_io->close();
    #if (! -e $query_file_pam) { die "Query file failed to be created."; }

    # get arguments to Run Bowtie2
    # ###print STDERR "DATABASE SELECTED: $db_id\n";
    
    my $basename = $c->config->{crispget_db_path};
    my $database = $db_folder;
    my $database_fullpath = File::Spec->catfile($basename, $database);
    $database_fullpath = File::Spec->catfile($database_fullpath, $db_id);
    my $database_title = $db_id;
    ###print STDERR "The database full path is ".$database_fullpath."\n";
    ###print STDERR "The database title ".$database_title."\n";


    my $err; 

    if ($align_tool eq "Bowtie"){
  
      # run bowtie2
      my $bowtie2_path = $c->config->{cluster_shared_bindir};
      ###print STDERR "The bowtie path is ".$bowtie2_path."\n";
      
      # bowtie2 command
      my @command = ("$bowtie2_path/bowtie2 --threads 1  --very-fast-local  --no-head  -L $guide_length -a -x $database_fullpath -f -U $query_file\_pam.fragments -S $query_file\_pam.bt2.out");
    
      ###print STDERR "Bowtie2 COMMAND: ".(join " ",@command)."\n";
      $err = system(@command);
    
      # bowtie command allowing 2 mismatch
      #my $err = system("$bowtie2_path/bowtie  --all -v 2 --threads 1 --seedlen $guide_length --sam --sam-nohead $database_fullpath -f $query_file.fragments $query_file.bt2.out");
   }elsif ($align_tool eq "BWA"){


   }


	if ($err) {
    ###print STDERR ($err); 
		$c->stash->{rest} = {error => "Bowtie execution failed"};
	} 
	else {
		$id = $urlencode{basename($seq_filename)};
		$c->stash->{rest} = {jobid =>basename($seq_filename),
							seq_length => length($sequence),
							db_name => $database_title,
              input_sequence=>$sequence,
		};
	}
}


sub view :Path('/crispget/view') Args(0) { 
    my $self = shift;
    my $c = shift;
    
    my $sequence = $c->req->param("sequence");
    my $seq_filename = $c->req->param("id"); #Bowtie 2 results
    my $guide_length = $c->req->param("guide_length");
    my $mismatch = $c->req->param("mismatch") || 0;
    my $align_tool = $c->req->param("align_tool"); 
    my $guide = $c->req->param("guide"); 
    my $db = $c->req->param("database")||undef;
    my $ref_gen_ext= $c->req->param("ref_gen_ext")||undef;

    ###print STDERR "My variables database: $db align tool:  $align_tool mismatch number $mismatch guide length $guide_length seq file name $seq_filename";
    
    my $status = $c->req->param("status") || 1;


    my $db_folder  = $db; 
    $db_folder =~ s|(.+)_|$1/|;

    
    

    #Bowtie 2 output
    $seq_filename = File::Spec->catfile($c->config->{cluster_shared_tempdir}, $seq_filename);
    $seq_filename =~ s/\%2F/\//g;
    
    #Get bowtie2 results
    my $io = Bio::SeqIO->new(-file=>$seq_filename, -format=>'fasta');
    my $query = $io->next_seq();
    
    my %matches;
    my @queries = ();

    my $basename = $c->config->{crispget_db_path};
    my $database = $db;
    my $bdb_full_name = File::Spec->catfile($basename, $db_folder);
    $bdb_full_name = File::Spec->catfile($bdb_full_name, $database);

    ###print STDERR "Heeey my basename $basename and my database $database and full database $bdb_full_name ......";

    # send variables to CrispgetGraph - Parse bowtie2 file 
    my $vg = CXGN::Graphics::CrispgetGraph->new();
    if ($align_tool eq "Bowtie"){
      $vg->result_file($seq_filename."_pam.bt2.out");
    }
    print STDERR "Here is the length $guide_length";
    #$vg->guide_length($guide_length+0);


    # parse Bowtie 2 result file
    if ($status == 1) {
        $vg->create_cfd_score($c->config->{crispget_db_path});
        $vg->create_mit_score($c->config->{crispget_db_path});
        $vg->parse($mismatch,$bdb_full_name,$c->config->{'cluster_shared_tempdir'}, $ref_gen_ext);
        #Find each guide scores
        $vg->get_CFD_score(); 
        ####print STDERR "DONEEEEE"; 
         $vg->get_MIT_score(); 
    }

    
    my $seq_length = length($query->seq());

    my @guides; 

    ###Parse guides as native data structure to create JSON 

    foreach my $g (@{$vg->guides}){

      my @off_targets; 

      foreach my $ot (@{$g->offtargets}){
        push (@off_targets, {
          id=>$ot->id,
          start=>$ot->start,
          end=>$ot->end,
          ref_gen=>$ot->ref_gen, 
          ref_gen_start=>$ot->ref_gen_start, 
          ref_gen_end=>$ot->ref_gen_end, 
          CFD_score=>$ot->CFD_score, 
          MIT_score=>$ot->MIT_score, 
          

        });
        ####print STDERR ".................".$ot->start."\n";
      }

      push (@guides, {
        sequence => $g->sequence, 
        line => $g ->line,
        MIT_score => $g->MIT_score, 
        CFD_score =>$g->CFD_score, 
        start_guide =>$g->start_guide,
        end_guide => $g ->end_guide,
        offtargets =>\@off_targets
      }); 

	}



    my $guides_json= new JSON;
    $guides_json = encode_json(\@guides); 

    ####print STDERR $guides_json; 

    # return variables
    $c->stash->{rest} = {

            guides=>$guides_json,
            line_length=> $vg->line_length,
						#score => s####printf("%.2f",($regions[1]*100/$seq_fragment)/$coverage),
						#coverage => $coverage,
						#f_size => $seq_fragment,
						#cbr_start => ($regions[4]+1),
						#cbr_end => ($regions[5]+1),
						#expr_msg => $expr_msg,
						#ids => [ $vg->subjects_by_match_count($bdb_full_name, $vg->matches()) ],
						#best_seq => $seq_str,
						query_seq => $sequence,
						#all_scores => $regions[2],
						#matches_aoa => $matches_AoA,
						#mismatch => $mismatch,
						#img_height => ($img_height+52),
            };
            
}


1;
