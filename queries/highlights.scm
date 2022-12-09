;; highlight queries.
;; See the syntax at https://tree-sitter.github.io/tree-sitter/using-parsers#pattern-matching-with-queries
;; See also https://github.com/nvim-treesitter/nvim-treesitter/blob/master/CONTRIBUTING.md#parser-configurations
;; for a list of recommended @ tags, though not all of them have matching
;; highlights in neovim.

[
   "abort"
   "abs"
   "accept"
   "all"
   "at"
   "begin"
   "declare"
   "delay"
   "until"
   "do"
   "end"
   "entry"
   "exit"
   "generic"
   "is"
   "null"
   "others"
   "out"
   "pragma"
   "renames"
   "when"
] @keyword
[
   "abstract"
   "access"
   "aliased"
   "array"
   "constant"
   "delta"
   "digits"
   "interface"
   "limited"
   "of"
   "private"
   "range"
   "synchronized"
   "tagged"
] @StorageClass
[
   "mod"
   "new"
   "protected"
   "record"
   "subtype"
   "task"
   "type"
] @type.definition
[
   "with"
   "use"
] @include
[
   "body"
   "function"
   "overriding"
   "procedure"
   "package"
   "separate"
] @keyword.function
[
   "and"
   "in"
   "not"
   "or"
   "xor"
] @keyword.operator
[
   "while"
   "loop"
   "for"
   "parallel"
   "reverse"
   "some"
] @keyword.repeat
[
   "return"
] @keyword.return
[
   "case"
   "if"
   "else"
   "then"
   "elsif"
   "select"
] @conditional
[
   "exception"
   "raise"
]  @exception
(comment)         @comment
(comment)         @spell       ;; spell-check comments
(string_literal)  @string
(string_literal)  @spell       ;; spell-check strings
(identifier)      @variable
(numeric_literal) @number

;; Highlight the name of subprograms
(procedure_specification name: (_) @function)
(function_specification name: (_) @function)
(package_specification name: (_) @function)
(package_body name: (_) @function)
(generic_instantiation name: (_) @function)

;; Some keywords should take different categories depending on the context
(use_clause "use"  @include "type" @include)
(with_clause "private" @include)
(with_clause "limited" @include)
(use_clause (identifier) @namespace)
(with_clause (identifier) @namespace)

(loop_statement "end" @keyword.repeat)
(if_statement "end" @conditional)
(loop_parameter_specification "in" @keyword.repeat)
(loop_parameter_specification "in" @keyword.repeat)
(iterator_specification ["in" "of"] @keyword.repeat)
(range_attribute_designator "range" @keyword.repeat)
(raise_statement "with" @exception)

(subprogram_declaration "is" @keyword.function "abstract"  @keyword.function)
(aspect_specification "with" @keyword.function)

(full_type_declaration "is" @type.definition)
(subtype_declaration "is" @type.definition)
(record_definition "end" @type.definition)
(full_type_declaration (_ "access" @type.definition))
(array_type_definition "array" @type.definition "of" @type.definition)
(access_to_object_definition "access" @type.definition)
(access_to_object_definition "access" @type.definition
   [
      (general_access_modifier "constant" @type.definition)
      (general_access_modifier "all" @type.definition)
   ]
)
(range_constraint "range" @type.definition)
(signed_integer_type_definition "range" @type.definition)
(index_subtype_definition "range" @type.definition)

;; Gray the body of expression functions
(expression_function_declaration
   (function_specification)
   "is"
   (_) @function.expression
)
(subprogram_declaration (aspect_specification) @function.expression)

;; Highlight full subprogram specifications
;(subprogram_body
;    [
;       (procedure_specification)
;       (function_specification)
;    ] @function.spec
;)

;; Highlight errors in red. This is not very useful in practice, as text will
;; be highlighted as user types, and the error could be elsewhere in the code.
;; This also requires defining    :hi @error guifg=Red    for instance.
(ERROR) @error

