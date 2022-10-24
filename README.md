# Tree-Sitter parser for Ada

The grammar is adapted from the work done by Stephen Leak for the
Emacs ada-mode. It was translated (partially for now) to tree-sitter
syntax, and slightly changed to reduce some conflicts. Tree-sitter
doesn't need a full syntax tree, so we can take some shortcuts in
the grammar.


## Installation

Execute the following commands:
```
   npm install
   npm run test
```

