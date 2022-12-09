;;  Better highlighting by referencing to the definition, for variable
;;  references. However, this is not yet supported by neovim
;;  See https://tree-sitter.github.io/tree-sitter/syntax-highlighting#local-variables

(package_specification) @scope
(subprogram_specification) @scope
(block_statement) @scope

(procedure_specification name: (identifier) @definition.var)
(function_specification name: (identifier) @definition.var)
(package_specification name: (identifier) @definition.var)
(package_body name: (identifier) @definition.var)
(generic_instantiation . name: (identifier) @definition.var)
(defining_identifier_list (identifier) @definition.var)

(identifier) @reference
