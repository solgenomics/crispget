
FROM debian:bullseye

EXPOSE 8088

RUN cat /etc/apt/sources.list

RUN apt-get update -y

RUN apt-get install -y apt-utils build-essential

RUN apt-get install -y less procps host lynx ncbi-blast+ ncbi-blast+-legacy cpanminus bioperl bioperl-run libcatalyst-perl bowtie2 libcatalyst-perl libcatalyst-view-mason-perl libcatalyst-action-rest-perl libplack-perl emacs locate ack

RUN cpanm --force Bio::BLAST::Database Plack::Handler::Starman Catalyst::Restarter Catalyst::View::HTML::Mason JSON 

ADD "https://www.random.org/cgi-bin/randbyte?nbytes=10&format=h" skipcache
COPY ./root /home/CRISPGET/root
COPY ./lib /home/CRISPGET/lib
COPY ./mason /home/CRISPGET/mason
COPY ./script/ /home/CRISPGET/script
COPY ./crispget_local.conf /home/CRISPGET/crispget_local.conf
COPY crispget.psgi /home/CRISPGET

COPY ./entrypoint.sh /entrypoint.sh

ENV  PERL5LIB=/home/CRISPGET/lib:/perl5/lib/perl5
ENV  comp_root=/home/CRISPGET/mason

WORKDIR /home/CRISPGET

ENTRYPOINT ["/entrypoint.sh"]
