
package CRISPGET::Controller::CrispgetTool;

use Moose;
use File::Basename;

BEGIN { extends 'Catalyst::Controller'; }

# this function read the database files (Bowtie2) and
# send the list of databases to the view input.mas
sub input :Path('/')  :Args(0) { 
	my ($self, $c) = @_;

	# get databases path from the configuration file
	my $db_path = $c->config->{crispget_db_path};
	my $default_db = $c->config->{crispget_default_db};
	
	# get database names from the files in the path
	my %databases;

	opendir(my $dh, $db_path) or die "can't opendir $db_path: $!";
	my @tpm_dbs = grep { /^[^.]/ && -d "$db_path/$_" } readdir($dh);
	closedir $dh;

	#my @tpm_dbs = glob("$db_path/*.rev.1.ebwt");
	# my @tpm_dbs = glob("$db_path/*.rev.1.bt2");
	foreach my $full_name (@tpm_dbs) {

		opendir(my $type, "$db_path/$full_name") or die "can't opendir $db_path/$full_name $!";
		my @types = grep { /^[^.]/ && -d "$db_path/$full_name/$_" } readdir($type);
		closedir $type;
		
		$databases{$full_name} = \@types || []; 

	}		
	##print STDERR "DATABASE ID: ".join(", ", @databases)."\n";
	
	# send the database names to the view file input.mas
	$c->stash->{template} = 'index.mas';
	$c->stash->{databases} = \%databases;
	$c->stash->{default_db} = $default_db;
}


1;
