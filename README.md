CRISPGET
====

Stand Alone version of SGN CRISPGET Tool

Developed on a Catalyst framework

### To add a CRISPGET dataset, use the following commands:

```
unzip GCA_003287315.1.zip
```
in emacs, replace the string >lcl| with > , if present
(otherwise, fastacmd will not work correctly)

Copy the dataset to the correct location, where the CRISPGET tool can see it. If using the docker, this target directory has to be mounted into the docker at ```/home/crispget_sequence_files/GCA_003287315.1/cds```.
```
sudo cp ncbi_dataset/data/GCA_003287315.1/cds_from_genomic.fna /export/prod/blast/databases/current/crispget/Phytophthora_cactorum_GCA_003287315.1_cds.fa
```
Enter the docker and issue the following command to index the file for BLAST:
```
docker exec -it crispget_tool bash
cd /home/crispget_sequence_files/GCA_003287315.1/cds

sudo makeblastdb -in Phytophthora_cactorum_GCA_003287315.1_cds.fa -dbtype nucl -out Phytophthora_cactorum_GCA_003287315.1_cds -parse_seqids
```
Index the file for use with bowtie2:
```
sudo bowtie-build -f /export/prod/blast/databases/current/crispget/Phytophthora_cactorum_GCA_003287315.1_cds.fa /export/prod/blast/databases/current/crispget/Phytophthora_cactorum_GCA_003287315.1_cds
```

## Installation

A docker build for the CRISPGET tool is available from docker hub and is the recommended installation method.

### Install docker on your system

To install the CRISPGET tool, first install docker. Refer to the [docker installation instructions on the Docker site](https://docs.docker.com/get-docker/). 

### Install ```git``` on your system

In Debian, Ubuntu, PoP_OS, etc., install git using ``` apt install git ```. On other platforms, use the respective packaging systems to install ```git```.

### Install the crispget_tool docker

To install the crispget_tool system, clone the git repository that contains the example ```docker-compose.yml``` file.
```
git clone https://github.com/solgenomics/CRISPGET
```
Run the crispget_tool from within the CRISPGET folder using:
```
docker compose up -d
```

By default, the CRISPGET interface will be available at ```localhost:8088```. To make the CRISPGET tool available through secure http, an ```nginx``` front-end is recommended, using an https certificate by [Let's encrypt](https://letsencrypt.org/).



### To start the server manually

If you install the system manually, you can start the server using the start script in the ```CRISPGET/``` directory. You can also use this script in the docker.

```
bash start_crispget.sh
```

The server needs to be stop by killing the ```crispget_server.pl``` process.
