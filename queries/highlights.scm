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
(procedure_specification
    (name) @function
)
(function_specification
    (name) @function
)
(package_specification
    name: (name) @function     ;;  Should use @module, but no default highlight
)
(package_body
    (name) @function     ;;  Should use @module, but no default highlight
)
(generic_instantiation
    . (name) @function
)

;; Change keyword categories inside type definitions.
;; WIP: waiting for simplified tree.
    ; [
    ;    "is"
    ;    "abstract"
    ;    "access"
    ;    "array"
    ;    "tagged"
    ;    "constant"
    ;    "range"
    ;    "mod"
    ;    "digits"
    ;    "delta"
    ;    "limited"
    ;    "synchronized"
    ; ]* @keyword.type
(full_type_declaration
    (identifier) @type
    "is"  @type.definition
    ; (access_type_definition "access" @keyword.type)
)

;; Highlight errors in red. This is not very useful in practice, as text will
;; be highlighted as user types, and the error could be elsewhere in the code.
;; This also requires defining    :hi @error guifg=Red    for instance.
(ERROR) @error

