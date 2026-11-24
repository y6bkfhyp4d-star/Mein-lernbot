#!/usr/bin/env ruby
# Trusted parser: parse untrusted YAML into Psych syntax tree, never load/instantiate objects.
require 'json'
require 'psych'

STDIN.binmode
source = STDIN.read(70_001) || ''.b
raise ArgumentError, 'input-limit' if source.bytesize > 70_000
source.force_encoding(Encoding::UTF_8)
raise ArgumentError, 'invalid-encoding' unless source.valid_encoding?
begin
  # parse_stream only constructs nodes. Do not use load, unsafe_load or to_ruby.
  Psych.parse_stream(source)
  result = {parsed: true, line: nil}
rescue Psych::SyntaxError => err
  result = {parsed: false, line: [1, err.line.to_i].max}
end
STDOUT.write(JSON.generate(result))
