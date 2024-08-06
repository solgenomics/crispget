package CRISPGET::View::Mason;
use Moose;
use namespace::autoclean;
use strict;
use warnings;
use Moose::Util::TypeConstraints;

extends 'Catalyst::View::HTML::Mason';
with 'Catalyst::Component::ApplicationAttribute';


__PACKAGE__->config(
    template_extension => '.mas',
    interp_args => {
        comp_root => [
            [ main => CRISPGET->path_to('mason') ],
        ],
    },
    
);

=head1 NAME

CRISPGET::View::Mason - TT View for CRISPGET

=head1 DESCRIPTION

TT View for CRISPGET.

=head1 SEE ALSO

L<CRISPGET>

=head1 AUTHOR

noe,,,,

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
