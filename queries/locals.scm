;;  Better highlighting by referencing to the definition, for variable
;;  references. However, this is not yet supported by neovim
;;  See https://tree-sitter.github.io/tree-sitter/syntax-highlighting#local-variables

(package_specification) @scope
(procedure_specification) @scope
(function_specification) @scope
(block_statement) @scope

(procedure_specification name: (_) @definition.var)
(function_specification name: (_) @definition.var)
(package_specification name: (_) @definition.var)
(package_body name: (_) @definition.var)
(generic_instantiation . name: (_) @definition.var)
(component_declaration (identifier) @definition.var)
(exception_declaration (identifier) @definition.var)
(formal_object_declaration (identifier) @definition.var)
(object_declaration (identifier) @definition.var)
(parameter_specification (identifier) @definition.var)

(identifier) @reference
