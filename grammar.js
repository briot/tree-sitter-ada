function toCaseInsensitive(a) {
   var ca = a.charCodeAt(0);
   if (ca>=97 && ca<=122) return `[${a}${a.toUpperCase()}]`;
   if (ca>=65 && ca<= 90) return `[${a.toLowerCase()}${a}]`;
   return a;
}

function caseInsensitive(keyword) {
   //return keyword;  //  Easier to read conflict messages
   return new RegExp(keyword
      .split('')
      .map(toCaseInsensitive)
      .join('')
   )
}

/**
 * A list of rules
 */
function list_of(separator, rule) {
   return seq(
      rule,
      repeat(seq(
         separator,
         rule,
      )),
   );
}

/**
 * Handles comma-separated lists of rules
 */
function comma_separated_list_of(rule) {
   return list_of(',', rule)
}

module.exports = grammar({
   name: 'ada',

   extras: $ => [
      /\s|\\\r?\n/,
      $.comment,
   ],

//   word: $ => $.keyword,
   word: $ => $.identifier,

   conflicts: $ => [
      // "name" can be either a simple name, or a defining_identifier_list
//      [$.direct_name, $.defining_identifier_list],

      // "function_specification is" could be either an expression function
      // specification, or a function specification
      // ??? Maybe we can merge both in the grammar
      [$.expression_function_declaration, $.subprogram_specification],

      // ??? Maybe we can merge these
      [$.null_procedure_declaration, $.subprogram_specification],

      // "'for' direct_name * 'use'"  could also be "'for' name * 'use'" as
      // specified in at_clause.
      [$.at_clause, $.name],

      // "procedure name is" could be either a procedure specification, or
      // a generic_instantiation.
      [$.generic_instantiation, $.procedure_specification],

      // Same for "package_specification ;"
      [$.generic_package_declaration, $._package_declaration],

      [$.attribute_definition_clause, $.attribute_reference],
      [$.record_extension_part, $.derived_type_definition],

   ],

   rules: {
      compilation: $ => repeat(
         $.compilation_unit,
      ),

      keyword: $ => /[a-zA-Z]+/,
      identifier: $ =>
         /[a-zA-Z\u{80}-\u{10FFFF}][0-9a-zA-Z_\u{80}-\u{10FFFF}]*/u,
      comment: $ => token(seq('--', /.*/)),
      string_literal: $ => token(/"[^"]*"/),
      character_literal: $ => token(/'.'/),
      numeric_literal: $ => token(
         choice(
            /[0-9]/,
            /[0-9_]+(\.[0-9]+)?([eE][0-9_-]+)?/,
            /[0-9]+#[0-9a-fA-F._-]+#/
         )
      ),
      relational_operator: $ => choice('=', '/=', '<', '<=', '>', '>='),
      binary_adding_operator: $ => choice('+', '-', '&'),
      unary_adding_operator: $ => choice('+', '-'),
      multiplying_operator: $ => choice('*', '/', 'mod', 'rem'),
      tick: $ => choice(
         '\'',    // But is not the start of a character_literal
      ),

      name_list: $ => comma_separated_list_of($.name),
      name: $ => choice(
         $.direct_name,
         $.explicit_dereference,
         $.selected_component,
         $.attribute_reference,
         $.function_call,
         $.character_literal,
         $.qualified_expression,
         '@',
      ),
      defining_identifier_list: $ => comma_separated_list_of($.identifier),
      direct_name: $ => choice(
         $.identifier,
         $.string_literal,
      ),
      explicit_dereference: $ => seq(
         $.name,
         '.',
         caseInsensitive('all'),
      ),
      selected_component: $ => seq(
         $.name,
         '.',
         $.selector_name,
      ),
      selector_name: $ => choice(
         $.direct_name,
         $.character_literal,
         caseInsensitive('others'),
      ),
      attribute_reference: $ => choice(
         seq(
            $.name,
            $.tick,
            $.attribute_designator,
         ),
//         $.reduction_attribute_reference,
      ),
//      reduction_attribute_reference: $ => seq(
//         $.value_sequence,
//         $.tick,
//         $.reduction_attribute_designator,
//      ),
      reduction_attribute_designator: $ => seq(
         $.identifier,
         '(',
         $.reduction_specification,
         ')',
      ),
      reduction_specification: $ => seq(
         $.name,
         ',',
         $.expression,
      ),
//    value_sequence: $ => seq(
//       '[',
//         optional(seq(
//             field('is_parallel', caseInsensitive('parallel')),
//             optional(seq(
//                '(',
//                $.chunk_specification,
//                ')',
//            )),
//         )),
//       $.iterated_element_association,
//       ']',
//    ),
      chunk_specification: $ => choice(
         $.simple_expression,
         seq(
            $.identifier,
            caseInsensitive('in'),
            $.discrete_subtype_definition,
         ),
      ),
      iterated_element_association: $ => seq(
         caseInsensitive('for'),
         choice(
            $.loop_parameter_specification,
            $.iterator_specification,
         ),
         optional(seq(
            caseInsensitive('use'),
            $.expression,
         )),
         $.assoc_expression,
      ),
      discrete_subtype_definition: $ => choice(
         $.subtype_indication,
         $.range_g,
      ),
      loop_parameter_specification: $ => seq(
         $.identifier,
         caseInsensitive('in'),
         optional(caseInsensitive('reverse')),
         $.discrete_subtype_definition,
         optional($.iterator_filter),
      ),
      loop_parameter_subtype_indication: $ => choice(
         $.subtype_indication,
         $.access_definition,
      ),
      iterator_filter: $ => seq(
         caseInsensitive('when'),
         $.condition,
      ),
      iterator_specification: $ => seq(
         $.identifier,
         optional(seq(
            ':',
            $.loop_parameter_subtype_indication,
         )),
         choice(
            caseInsensitive('in'),
            caseInsensitive('of'),
         ),
         optional(caseInsensitive('reverse')),
         $.name,
         optional($.iterator_filter),
      ),
      attribute_designator: $ => choice(
         $.identifier,
         caseInsensitive('access'),
         caseInsensitive('delta'),
         caseInsensitive('digits'),
         caseInsensitive('mod'),
      ),
      function_call: $ => seq(
         $.name,
         $.actual_parameter_part,
      ),
      qualified_expression: $ => seq(
         $.name,
         $.tick,
         $.aggregate,
      ),
      compilation_unit: $ => choice(
         $.with_clause,
         seq(
            optional(caseInsensitive('private')),
            $._declarative_item,
         ),
         $.statement,
         $.subunit,
         $.entry_declaration,
      ),
      _declarative_item: $ => choice(
         $._basic_declarative_item,
         $.proper_body,
         $.body_stub,
      ),
      _basic_declarative_item: $ => choice(
         $._basic_declaration,
         $.aspect_clause,
         $.use_clause,
      ),
      _basic_declaration: $ => choice(
         $.type_declaration,
         $.subtype_declaration,
         $.object_declaration,
         $.number_declaration,
         $.subprogram_declaration,
         $.abstract_subprogram_declaration,
         $.null_procedure_declaration,
         $.expression_function_declaration,
         $._package_declaration,
         $.renaming_declaration,
         $.exception_declaration,
         $.generic_declaration,
         $.generic_instantiation,
      ),
      _package_declaration: $ => seq(
         $.package_specification,
         ';',
      ),
      package_specification: $ => seq(
         caseInsensitive('package'),
         field('name', $.name),  //  $.defining_program_unit_name),
         optional($.aspect_specification),
         caseInsensitive('is'),
         optional($._basic_declarative_item_list),
         optional(seq(
             caseInsensitive('private'),
             optional($._basic_declarative_item_list),
         )),
         caseInsensitive('end'),
         field('endname', optional($.name)),
      ),
      with_clause: $ => seq(
         field('is_limited', optional(caseInsensitive('limited'))),
         field('is_private', optional(caseInsensitive('private'))),
         caseInsensitive('with'),
         field('names', $.name_list),
         ';',
      ),
      use_clause: $ => seq(
         caseInsensitive('use'),
         optional(seq(
            field('is_all', optional(caseInsensitive('all'))),
            field('is_type', caseInsensitive('type')),
         )),
         $.name_list,
         ';',
      ),
      subunit: $ => seq(
         caseInsensitive('separate'),
         '(',
         $.name,
         ')',
         $.proper_body,
      ),
      proper_body: $ => choice(
//         $.subprogram_body,
         $.package_body,
//         $.task_body,
//         $.protected_body,
      ),
      package_body: $ => seq(
         caseInsensitive('package'),
         caseInsensitive('body'),
         $.name,
         optional($.aspect_specification),
         caseInsensitive('is'),
         optional($.non_empty_declarative_part),
         optional(seq(
            caseInsensitive('begin'),
            $.handled_sequence_of_statements,
         )),
         caseInsensitive('end'),
         optional($.name),
         ';',
      ),
      subtype_indication: $ => seq(
         optional($.null_exclusion),
         $.name,
         optional($.constraint),
      ),
      constraint: $ => choice(
         $.scalar_constraint,
         $.index_constraint,
      ),
      scalar_constraint: $ => choice(
         $.range_constraint,
         $.digits_constraint,
         $.delta_constraint,
      ),
      range_g: $ => choice(
//         $.range_attribute_reference,
         seq(
            $.simple_expression,
            '..',
            $.simple_expression,
         ),
      ),
      range_constraint: $ => seq(
         caseInsensitive('range'),
         $.range_g,
      ),
      condition: $ => seq(
         $.expression,
         ';',
      ),
      expression: $ => choice(
         $.relation,
         seq($.relation, $.AND_relation_list),
         seq($.relation, $.AND_THEN_relation_list),
         seq($.relation, $.OR_relation_list),
         seq($.relation, $.OR_ELSE_relation_list),
         seq($.relation, $.XOR_relation_list),
      ),
      assoc_expression: $ => seq(
         '=>',
         choice(
            $.expression,
            '<>',
         ),
      ),
      AND_relation_list: $ => repeat1(seq(
         caseInsensitive('and'),
         $.relation,
      )),
      AND_THEN_relation_list: $ => repeat1(seq(
         caseInsensitive('and'),
         caseInsensitive('then'),
         $.relation,
      )),
      OR_relation_list: $ => repeat1(seq(
         caseInsensitive('or'),
         $.relation,
      )),
      OR_ELSE_relation_list: $ => repeat1(seq(
         caseInsensitive('or'),
         caseInsensitive('else'),
         $.relation,
      )),
      XOR_relation_list: $ => repeat1(seq(
         caseInsensitive('xor'),
         $.relation,
      )),
      relation: $ => choice(
         seq(
            $.simple_expression,
            optional(seq(
               $.relational_operator,
               $.simple_expression,
            ))
         ),
//         seq(
//            $.simple_expression,
//            optional(caseInsensitive('not')),
//            caseInsensitive('in'),
//            $.membership_choice_list,
//         ),
//         $.raise_expression,
      ),
      simple_expression: $ => seq(
         optional($.unary_adding_operator),
         $.term,
         repeat(seq(
            $.binary_adding_operator,
            $.term,
         )),
      ),
      term: $ => seq(
         $.factor,
         repeat(seq(
            $.multiplying_operator,
            $.factor,
         )),
      ),
      factor: $ => choice(
         seq(
            $.primary,
            optional(seq(
               '**',
               $.primary,
            )),
         ),
         seq(
            caseInsensitive('abs'),
            $.primary,
         ),
         seq(
            caseInsensitive('not'),
            $.primary,
         ),
      ),
      primary: $ => choice(
         $.numeric_literal,
         caseInsensitive('null'),
         $.aggregate,
         $.name,
//         $.allocator,
      ),
      access_definition: $ => seq(
         optional($.null_exclusion),
         caseInsensitive('access'),
         choice(
            seq(
               optional(caseInsensitive('constant')),
               $.name,
            ),
            seq(
               optional(caseInsensitive('protected')),
               caseInsensitive('procedure'),
               optional($.non_empty_parameter_profile),
            ),
            seq(
               optional(caseInsensitive('protected')),
               caseInsensitive('function'),
               $.parameter_and_result_profile,
            ),
         ),
      ),
      actual_parameter_part: $ => seq(
         '(',
         choice(
            comma_separated_list_of($.parameter_association),
//            $.conditional_expression,
//            $.quantified_expression,
//            $.declare_expression,
         ),
         ')',
      ),
      parameter_association: $ => choice(
         seq(
            $.component_choice_list,
            $.assoc_expression,
         ),
         $.expression,
         '<>',
      ),
      component_choice_list: $ => choice(
         $.selector_name,
         seq(
            $.component_choice_list,
            '|',
            $.selector_name,
         ),
      ),
      aggregate: $ => choice(
         $.record_aggregate,
//         $.extension_aggregate,
//         $.array_aggregate,
//         $.delta_aggregate,
//         seq(
//            '(',
//            choice(
//               $.conditional_expression,
//               $.quantified_expression,
//               $.declare_expression,
//            ),
//            ')',
//         ),
      ),
      record_aggregate: $ => seq(
         '(',
         $.record_component_association_list,
         ')',
      ),
      record_component_association_list: $ => choice(
//         comma_separated_list_of($.record_component_association),
         seq(
            caseInsensitive('null'),
            caseInsensitive('record'),
         ),
      ),
      null_exclusion: $ => seq(
         caseInsensitive('not'),
         caseInsensitive('null'),
      ),
      index_constraint: $ => seq(
         '(',
//         comma_separated_list_of($.discrete_range),
         ')',
      ),
      digits_constraint: $ => seq(
         caseInsensitive('digits'),
         $.simple_expression,
         optional($.range_constraint),
      ),
      delta_constraint: $ => seq(
         caseInsensitive('delta'),
         $.simple_expression,
         optional($.range_constraint),
      ),
      _basic_declarative_item_list: $ => repeat1(
         $._basic_declarative_item_pragma,
      ),
      _basic_declarative_item_pragma: $ => choice(
         $._basic_declarative_item,
         $.pragma_g,
      ),
      type_declaration: $ => choice(
         $.full_type_declaration,
//         $.incomplete_type_declaration,
//         $.private_type_declaration,
//         $.private_extension_declaration,
      ),
      full_type_declaration: $ => choice(
         seq(
            caseInsensitive('type'),
            $.identifier,
//            optional($.known_discriminant_part),
            caseInsensitive('is'),
            $.type_definition,
//            optional($.aspect_specification),
            ';',
         ),
//         $.task_type_declaration,
//         $.protected_type_declaration,
      ),
      type_definition: $ => choice(
//         $.enumeration_type_definition,
         $.integer_type_definition,
//         $.real_type_definition,
//         $.array_type_definition,
//         $.record_type_definition,
//         $.access_type_definition,
         $.derived_type_definition,
//         $.interface_type_definition,
      ),
      integer_type_definition: $ => choice(
         $.signed_integer_type_definition,
//         $.modular_type_definition,
      ),
      signed_integer_type_definition: $ => seq(
         caseInsensitive('range'),
         $.simple_expression,
         '..',
         $.simple_expression,
      ),
      derived_type_definition: $ => seq(
         optional(caseInsensitive('abstract')),
         optional(caseInsensitive('limited')),
         caseInsensitive('new'),
         $.subtype_indication,
         optional(seq(
//            optional(seq(
//               caseInsensitive('and'),
//               $.interface_list,
//            )),
            $.record_extension_part,
         )),
      ),
      record_extension_part: $ => seq(
         caseInsensitive('with'),
         $.record_definition,
      ),
      record_definition: $ => choice(
         seq(
            caseInsensitive('record'),
            $.component_list,
            caseInsensitive('end'),
            caseInsensitive('record'),
            optional($.identifier),
         ),
         seq(
            caseInsensitive('null'),
            caseInsensitive('record'),
         ),
      ),
      component_list: $ => choice(
         repeat1($.component_item),
//         seq(
//            optional($.component_item),
//            $.variant_part,
//         ),
         caseInsensitive('null'),
      ),
      component_item: $ => seq(
         $.component_declaration,
         $.aspect_clause,
      ),
      component_declaration: $ => seq(
         $.defining_identifier_list,
         ':',
         $.component_definition,
//         optional($.assign_value),
         optional($.aspect_specification),
         ';'
      ),
      component_definition: $ => seq(
         optional(caseInsensitive('aliased')),
         choice(
            $.subtype_indication,
//            $.access_definition,
         ),
      ),


      abstract_subprogram_declaration: $ => seq(
         optional($.overriding_indicator),
         $.subprogram_specification,
         caseInsensitive('is'),
         caseInsensitive('abstract'),
         $.aspect_specification,
         ';',
      ),
      array_aggregate: $ => choice(
//         $.position_array_aggregate,
//         $.null_array_aggregate,
//         $.named_array_aggregate,
      ),
      aspect_association: $ => seq(
         $.aspect_mark,
         optional(seq(
            '=>',
            $.aspect_definition,
         )),
      ),
      aspect_clause: $ => choice(
         $.attribute_definition_clause,
         $.enumeration_representation_clause,
         $.record_representation_clause,
         $.at_clause,
      ),
      aspect_definition: $ => choice(
         $.expression,
         $.global_aspect_definition,
      ),
      aspect_mark: $ => seq(
         $.identifier,
         optional(seq(
            $.tick,
            $.identifier,
         )),
      ),
      aspect_mark_list: $ => comma_separated_list_of($.aspect_association),
      aspect_specification: $ => seq(
         caseInsensitive('with'),
         $.aspect_mark_list,
      ),
      at_clause: $ => seq(
         caseInsensitive('for'),
         $.direct_name,
         caseInsensitive('use'),
         caseInsensitive('at'),
         $.expression,
         ';',
      ),
      attribute_definition_clause: $ => seq(
         caseInsensitive('for'),
         $.name,
         $.tick,
         $.attribute_designator,
         caseInsensitive('use'),
         $.expression,
         ';',
      ),
      body_stub: $ => choice(
//         $.subprogram_body_stub,
//         $.package_body_stub,
//         $.task_body_stub,
//         $.protected_body_stub,
      ),
      choice_parameter_specification: $ => $.identifier,  // ??? inline
      component_clause: $ => seq(
         $.name,
         caseInsensitive('at'),
         field('position', $.expression),
         caseInsensitive('range'),
         field('first_bit', $.simple_expression),
         '..',
         field('last_bit', $.simple_expression),
         ';',
      ),
      declarative_item_pragma: $ => choice(
         $._declarative_item,
         $.pragma_g,
      ),
      non_empty_declarative_part: $ => repeat1(
         $.declarative_item_pragma,
      ),
      entry_declaration: $ => seq(
         optional($.overriding_indicator),
         caseInsensitive('entry'),
         $.identifier,
         optional(seq(
            '(',
            $.discrete_subtype_definition,
            ')',
         )),
         optional($.non_empty_parameter_profile),
         optional($.aspect_specification),
         ';',
      ),
      enumeration_aggregate: $ => $.array_aggregate,   //  ??? inline
      enumeration_representation_clause: $ => seq(
         caseInsensitive('for'),
         $.name,
         caseInsensitive('use'),
         $.enumeration_aggregate,
         ';',
      ),
      exception_choice_list: $ => list_of('|', $.exception_choice),
      exception_choice: $ => choice(
         $.name,
         caseInsensitive('others'),
      ),
      exception_declaration: $ => seq(
         $.defining_identifier_list,
         ':',
         caseInsensitive('exception'),
         optional($.aspect_specification),
         ';',
      ),
      exception_handler: $ => seq(
         caseInsensitive('when'),
         optional(seq(
            $.choice_parameter_specification,
            ':',
         )),
         $.exception_choice_list,
         '=>',
         $.sequence_of_statements,
      ),
      exception_handler_list: $ => repeat1(choice(
         $.exception_handler,
         $.pragma_g,
      )),
      expression_function_declaration: $ => seq(
         optional($.overriding_indicator),
         $.function_specification,
         caseInsensitive('is'),
         '(',
         $.expression,
         ')',
         optional($.aspect_specification),
         ';',
      ),
      formal_part: $ => seq(
         '(',
         $.parameter_specification_list,
         ')',
      ),
      function_specification: $ => seq(
         caseInsensitive('function'),
         $.name,
         $.parameter_and_result_profile,
      ),
      generic_declaration: $ => choice(
         $.generic_subprogram_declaration,
         $.generic_package_declaration,
      ),
      generic_formal_part: $ => seq(
         caseInsensitive('generic'),
         repeat($.generic_formal_parameter_declaration),
      ),
      generic_formal_parameter_declaration: $ => choice(
//         $.formal_objet_declaration,
//         $.formal_type_declaration,
//         $.formal_subprogram_declaration,
//         $.formal_package_declaration,
         $.use_clause,
         $.pragma_g,
      ),
      generic_subprogram_declaration: $ => seq(
         $.generic_formal_part,
         $.subprogram_specification,
         optional($.aspect_specification),
         ';',
      ),
      generic_package_declaration: $ => seq(
         $.generic_formal_part,
         $.package_specification,
         ';',
      ),
      generic_instantiation: $ => seq(
         choice(
            caseInsensitive('package'),
            seq(
               optional($.overriding_indicator),
               choice(
                  caseInsensitive('procedure'),
                  caseInsensitive('function'),
               ),
            ),
         ),
         $.name,
         caseInsensitive('is'),
         caseInsensitive('new'),
         $.name,   //  includes the generic_actual_part
         optional($.aspect_specification),
         ';',
      ),
      global_aspect_definition: $ => choice(
         seq(
            $.global_mode,
//            $.global_designator,
         ),
//         $.extended_global_aspect_definition,
         seq(
            '(',
            comma_separated_list_of($.global_aspect_element),
            ')',
         ),
      ),
      global_aspect_element: $ => choice(
         seq(
            $.global_mode,
            $.global_set,
         ),
//         $.extended_global_aspect_definition,
      ),
      global_mode: $ => choice(
         $.non_empty_mode,
         caseInsensitive('overriding'),
      ),
      global_set: $ => prec.left(
         comma_separated_list_of($.name),   // ??? name_list
      ),
      handled_sequence_of_statements: $ => seq(
         $.sequence_of_statements,
         optional(seq(
            caseInsensitive('exception'),
            $.exception_handler_list,
         )),
      ),
      label: $ => seq(
         '<<',
         field('statement_identifier', $.direct_name),
         '>>',
      ),
      mod_clause: $ => seq(
         caseInsensitive('at'),
         caseInsensitive('mod'),
         $.expression,
         ';',
      ),
      non_empty_mode: $ => choice(
         caseInsensitive('in'),
         seq(
            caseInsensitive('in'),
            caseInsensitive('out'),
         ),
         caseInsensitive('out'),
      ),
      null_procedure_declaration: $ => seq(
         optional($.overriding_indicator),
         $.procedure_specification,
         caseInsensitive('is'),
         caseInsensitive('null'),
//         optional($.aspect_specification),
      ),
      null_statement: $ => seq(
         caseInsensitive('null'),
         ';',
      ),
      number_declaration: $ => seq(
         $.defining_identifier_list,
         ';',
         caseInsensitive('constant'),
//         $.assign_value,
         ';',
      ),
      object_declaration: $ => choice(
         seq(
            $.defining_identifier_list,
            ':',
            caseInsensitive('aliased'),
            caseInsensitive('constant'),
            choice(
               $.subtype_indication,
               $.access_definition,
//               $.array_type_definition,
            ),
//            optional($.assign_value),
            optional($.aspect_specification),
            ';',
         ),
//         $.single_task_declaration,
//         $.single_protected_declaration,
      ),
      overriding_indicator: $ => seq(
         optional(caseInsensitive('not')),
         caseInsensitive('overriding'),
      ),
      non_empty_parameter_profile: $ =>  // ??? inline
         $.formal_part,
      parameter_and_result_profile: $ => seq(
         optional($.formal_part),
         $.result_profile,
      ),
      parameter_specification: $ => seq(
         $.defining_identifier_list,
         ':',
         optional(caseInsensitive('aliased')),
         optional($.non_empty_mode),
         optional($.null_exclusion),
         $.name,
//         optional($.assign_value),
      ),
      parameter_specification_list: $ => list_of(
         ';',
         $.parameter_specification,
      ),
      pragma_g: $ => seq(
         caseInsensitive('pragma'),
         $.identifier,
         optional(seq(
            '(',
            choice(
//               $.pragma_argument_association_list,
//               $.conditional_quantified_expression,
            ),
            ')',
         )),
         ';'
      ),
      procedure_specification: $ => seq(
         caseInsensitive('procedure'),
         $.name,
         optional($.non_empty_parameter_profile),
      ),
      record_representation_clause: $ => prec.left(seq(
         caseInsensitive('for'),
         $.name,
         caseInsensitive('use'),
         caseInsensitive('record'),
         optional($.mod_clause),
         repeat($.component_clause),
         caseInsensitive('end'),
         caseInsensitive('record'),
         optional($.name),
      )),
      renaming_declaration: $ => choice(
//         $.object_renaming_declaration,
//         $.exception_renaming_declaration,
//         $.package_renaming_declaration,
//         $.subprogram_renaming_declaration,
//         $.generic_renaming_declaration,
      ),
      result_profile: $ => seq(
         caseInsensitive('return'),
         choice(
            seq(
               optional($.null_exclusion),
               $.name,
            ),
            $.access_definition,
         ),
      ),
      sequence_of_statements: $ => prec.left(seq(
         repeat1($.statement),
         repeat($.label),
      )),
      simple_statement: $ => choice(
         $.null_statement,
//         $.assignment_statement,
//         $.exit_statement,
//         $.goto_statement,
//         $.procedure_call_statement,
//         $.simple_return_statement,
//         $.requeue_statement,
//         $.delay_statement,
//         $.abort_statement,
//         $.raise_statement,
         $.pragma_g,
      ),
      statement: $ => seq(
         repeat($.label),
         choice(
            $.simple_statement,
//            $.compound_statement,
         ),
      ),
      subprogram_declaration: $ => seq(
         optional($.overriding_indicator),
         $.subprogram_specification,
         optional($.aspect_specification),
         ';',
      ),
      subprogram_specification: $ => choice(
         $.procedure_specification,
         $.function_specification,
      ),
      subtype_declaration: $ => seq(
         caseInsensitive('subtype'),
         $.identifier,
         caseInsensitive('is'),
         $.subtype_indication,
         optional($.aspect_specification),
         ';',
      ),
   }
});
