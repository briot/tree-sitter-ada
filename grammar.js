/**
 * A case-insensitive keyword (copied from VHDL grammar)
 */
const reservedWord = word =>
   //word ||  // when debugging conflict error msgs
   alias(reserved(caseInsensitive(word)), word)
   ;
const reserved = regex => token(prec(2, new RegExp(regex)));
const caseInsensitive = word =>
  word.split('')
    .map(letter => `[${letter}${letter.toUpperCase()}]`)
    .join('');

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

   word: $ => $.identifier,

   conflicts: $ => [
      // ??? Maybe we can merge these
      [$.null_procedure_declaration, $.subprogram_specification],
      [$.expression_function_declaration, $.subprogram_specification],

      // "'for' _direct_name * 'use'"  could also be "'for' name * 'use'" as
      // specified in at_clause.
      [$.at_clause, $.name],

      // name ':=' '(' _direct_name . '=>'
      // Where the direct_name could be a name or selector_name
      [$.name, $.selector_name],

      // name ':=' '(' expression . ',' ...
      [$.expression_list, $.record_component_association],

      // "procedure name is" could be either a procedure specification, or
      // a generic_instantiation.
      [$.generic_instantiation, $.procedure_specification],

      // Same for "package_specification ;"
      [$.generic_package_declaration, $._package_declaration],

      [$.attribute_definition_clause, $.attribute_reference],

      // _direct_name '.' name . '''
      // Could be either   _direct_name '.' (attribute_reference name . tick
      //   or              (name _direct_name '.' name) . '''
      [$.name, $.attribute_reference],

      // identifier . ':' ...
      [$.defining_identifier_list, $.object_renaming_declaration,
         $.exception_renaming_declaration],
      [$.defining_identifier_list, $.object_renaming_declaration,
         $.exception_renaming_declaration, $._direct_name],
      [$.defining_identifier_list, $._direct_name],
      [$.defining_identifier_list, $.object_renaming_declaration],

      // 'generic' . 'package' ...
      [$.generic_formal_part, $.generic_renaming_declaration],

      // 'type' identifier 'is' 'new' subtype_indication . 'with'
      // which could be either a record_extension_part or
      // an aspect_specification.
      [$.derived_type_definition],

      // 'for' name 'use' '(' name . '=>' ...
      //    The name could either be from a primary or a subtype_indication.
      [$.subtype_indication, $.primary],

      // 'for' name 'use' '(' 'for' identifier 'in' name . 'use'
      [$.iterator_specification, $.subtype_indication],

      // 'type' identifier 'is' 'mod' 'raise' name . 'with' ...
      // ??? This appears legal Ada per the grammar, but doesn't make sense.
      // ??? This results in a large slowdown of the parser
      [$.raise_expression],

      // 'type' identifier known_discriminant_part . 'is' ...
      [$.full_type_declaration, $.discriminant_part],

      // 'type' identifier 'is' 'new' subtype_indication . 'with' .
      [$.private_extension_declaration, $.derived_type_definition],

      [$.function_call, $.procedure_call_statement],
      [$.function_call, $.name],
      [$.selector_name, $.primary],
      [$.formal_derived_type_definition],
      [$._direct_name, $.aspect_mark],
      [$.name, $.attribute_reference, $.qualified_expression],
      [$._direct_name, $.package_body_stub],

   ],

   rules: {
      compilation: $ => repeat(
         $.compilation_unit,
      ),

      identifier: $ =>
         /[a-zA-Z\u{80}-\u{10FFFF}][0-9a-zA-Z_\u{80}-\u{10FFFF}]*/u,
      comment: $ => token(seq('--', /.*/)),
      string_literal: $ => token(/"[^"]*"/),
      character_literal: $ => token(/'.'/),
      numeric_literal: $ => token(
         choice(
            /[0-9][0-9_]*(\.[0-9]+)?([eE][0-9_-]+)?/,
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

      // Simpler definition for games than the standard grammer
//      name: $ => choice(
//         $.explicit_dereference,
//         $.selected_component,
//      ),
//      _direct_name: $ => choice(
//         $.identifier,
//         $.string_literal,
//      ),

      _direct_name: $ => $.identifier,
      name: $ => choice(
         seq(
            $._direct_name,
            optional(seq(
               '.',
               $.name,
            )),
         ),
         $.attribute_reference,
         $.function_call,
         $.qualified_expression,
         '@',
         //$.character_literal, //  from adamode, seems wrong.
         //$.string_literal,    // from ada-mode, but seems wrong.
         //                     // Added to primary instead
      ),

      name_list: $ => comma_separated_list_of($.name),
      defining_identifier_list: $ => comma_separated_list_of($.identifier),

      explicit_dereference: $ => seq(
         $.name,
         '.',
         reservedWord('all'),
      ),

      // ??? Seems to allow  'name.others' as a component
      selected_component: $ => seq(
         $.name,
         '.',
         $.selector_name,
      ),
      selector_name: $ => choice(
         $._direct_name,
//         $.character_literal,  // was in ada-mode, moved to primary instead
//         reservedWord('others'),
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
//             field('is_parallel', reservedWord('parallel')),
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
            reservedWord('in'),
            $.discrete_subtype_definition,
         ),
      ),
      iterated_element_association: $ => seq(
         reservedWord('for'),
         choice(
            $.loop_parameter_specification,
            $.iterator_specification,
         ),
         optional(seq(
            reservedWord('use'),
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
         reservedWord('in'),
         optional(reservedWord('reverse')),
         $.discrete_subtype_definition,
         optional($.iterator_filter),
      ),
      loop_parameter_subtype_indication: $ => choice(
         $.subtype_indication,
         $.access_definition,
      ),
      iterator_filter: $ => seq(
         reservedWord('when'),
         field('condition', $.expression),
      ),
      iterator_specification: $ => seq(
         $.identifier,
         optional(seq(
            ':',
            $.loop_parameter_subtype_indication,
         )),
         choice(
            reservedWord('in'),
            reservedWord('of'),
         ),
         optional(reservedWord('reverse')),
         $.name,
         optional($.iterator_filter),
      ),
      attribute_designator: $ => choice(
         $.identifier,    //  missing  function_call
         reservedWord('access'),
         reservedWord('delta'),
         reservedWord('digits'),
         reservedWord('mod'),
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
            optional(reservedWord('private')),
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
         $.expression_function_declaration,
         $.null_procedure_declaration,
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
         reservedWord('package'),
         field('name', $.name),
         optional($.aspect_specification),
         reservedWord('is'),
         repeat($._basic_declarative_item_pragma),
         optional(seq(
             reservedWord('private'),
             repeat($._basic_declarative_item_pragma),
         )),
         reservedWord('end'),
         field('endname', optional($.name)),
      ),
      with_clause: $ => seq(
         field('is_limited', optional(reservedWord('limited'))),
         field('is_private', optional(reservedWord('private'))),
         reservedWord('with'),
         field('names', $.name_list),
         ';',
      ),
      use_clause: $ => seq(
         reservedWord('use'),
         optional(seq(
            field('is_all', optional(reservedWord('all'))),
            field('is_type', reservedWord('type')),
         )),
         $.name_list,
         ';',
      ),
      subunit: $ => seq(   //  10.1.3
         reservedWord('separate'),
         '(',
         field('parent_unit_name', $.name),
         ')',
         $.proper_body,
      ),
      proper_body: $ => choice(
         $.subprogram_body,
         $.package_body,
         $.task_body,
//         $.protected_body,
      ),
      subprogram_body: $ => seq(
         optional($.overriding_indicator),
         $.subprogram_specification,
         optional($.aspect_specification),
         reservedWord('is'),
         optional($.non_empty_declarative_part),
         reservedWord('begin'),
         $.handled_sequence_of_statements,
         reservedWord('end'),
         optional($.name),
         ';'
      ),
      package_body: $ => seq(
         reservedWord('package'),
         reservedWord('body'),
         $.name,
         optional($.aspect_specification),
         reservedWord('is'),
         optional($.non_empty_declarative_part),
         optional(seq(
            reservedWord('begin'),
            $.handled_sequence_of_statements,
         )),
         reservedWord('end'),
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
         reservedWord('range'),
         $.range_g,
      ),
      expression_list: $ => prec.left(
         comma_separated_list_of($.expression),
      ),
      expression: $ => choice(
         list_of(reservedWord('and'), $.relation),
         list_of(seq(reservedWord('and'), reservedWord('then')), $.relation),
         list_of(reservedWord('or'), $.relation),
         list_of(seq(reservedWord('or'), reservedWord('else')), $.relation),
         list_of(reservedWord('xor'), $.relation),
      ),
      assoc_expression: $ => choice(
         seq('=>', '<>'),
         $._non_default_assoc_expression,
      ),
      _non_default_assoc_expression: $ => seq(
         '=>',
         $.expression,
      ),
      relation: $ => choice(
         seq(
            $.simple_expression,
            optional(seq(
               $.relational_operator,
               $.simple_expression,
            )),
         ),
         seq(
            $.simple_expression,
            optional(reservedWord('not')),
            reservedWord('in'),
            $.membership_choice_list,
         ),
         $.raise_expression,
      ),
      raise_expression: $ => seq(
         reservedWord('raise'),
         $.name,
         optional(seq(
            reservedWord('with'),
            $.simple_expression,
         )),
      ),
      membership_choice_list: $ => prec.right(
         list_of('|', $.membership_choice),
      ),
      membership_choice: $ => choice(
         $.simple_expression,
         $.range_g,
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
            reservedWord('abs'),
            $.primary,
         ),
         seq(
            reservedWord('not'),
            $.primary,
         ),
      ),
      primary: $ => choice(
         $.numeric_literal,
         reservedWord('null'),
         $.aggregate,
         $.name,
         $.string_literal,  // ada-mode puts this in name instead
         $.character_literal,
         $.allocator,
      ),
      allocator: $ => seq(
         reservedWord('new'),
         optional($.subpool_specification),
         $.subtype_indication_paren_constraint,
      ),
      subtype_indication_paren_constraint: $ => seq(
         optional($.null_exclusion),
         $.name,
         optional($.index_constraint),
      ),
      subpool_specification: $ => seq(
         '(',
         $.name,
         ')',
      ),
      access_type_definition: $ => seq(
         optional($.null_exclusion),
         choice(
            $.access_to_object_definition,
            seq(
               reservedWord('access'),
               optional(reservedWord('protected')),
               $.access_to_subprogram_definition,
            ),
         ),
      ),
      access_to_object_definition: $ => seq(
         reservedWord('access'),
         optional($.general_access_modifier),
         $.subtype_indication,
      ),
      general_access_modifier: $ => choice(
         reservedWord('all'),
         reservedWord('constant'),
      ),
      access_to_subprogram_definition: $ => choice(
         seq(
            reservedWord('procedure'),
            optional($.formal_part),
         ),
         seq(
            reservedWord('function'),
            $.parameter_and_result_profile,
         ),
      ),
      access_definition: $ => seq(
         optional($.null_exclusion),
         reservedWord('access'),
         choice(
            seq(
               optional(reservedWord('constant')),
               $.name,
            ),
            seq(
               optional(reservedWord('protected')),
               reservedWord('procedure'),
               optional($.non_empty_parameter_profile),
            ),
            seq(
               optional(reservedWord('protected')),
               reservedWord('function'),
               $.parameter_and_result_profile,
            ),
         ),
      ),
      actual_parameter_part: $ => seq(
         '(',
         choice(
            comma_separated_list_of($.parameter_association),
            $.conditional_expression,
            $.quantified_expression,
            $.declare_expression,
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
      conditional_expression: $ => choice(
         $.if_expression,
         $.case_expression,
      ),
      conditional_quantified_expression: $ => choice(
         $.if_expression,
         $.case_expression,
         $.quantified_expression,
      ),
      quantified_expression: $ => seq(
         reservedWord('for'),
         $.quantifier,
         choice(
            $.loop_parameter_specification,
            $.iterator_specification,
         ),
         $.assoc_expression,
      ),
      declare_expression: $ => seq(
         reservedWord('declare'),
         repeat($.declare_item),
         reservedWord('begin'),
         $.expression,
      ),
      declare_item: $ => choice(
         $.object_declaration,
         $.object_renaming_declaration,
      ),
      quantifier: $ => choice(
         reservedWord('all'),
         reservedWord('some'),
      ),
      case_expression: $ => seq(
         reservedWord('case'),
         $.expression,
         reservedWord('is'),
         comma_separated_list_of($.case_expression_alternative),
      ),
      case_expression_alternative: $ => seq(
         reservedWord('when'),
         $.discrete_choice_list,
         $._non_default_assoc_expression,
      ),
      component_choice_list: $ =>
         list_of('|', $.selector_name),
      aggregate: $ => choice(
         $.record_aggregate,
         $.extension_aggregate,
         $.array_aggregate,
         $.delta_aggregate,
         seq(
            '(',
            choice(
               $.conditional_expression,
               $.quantified_expression,
               $.declare_expression,
            ),
            ')',
         ),
      ),
      delta_aggregate: $ => choice(
         $.record_delta_aggregate,
         $.array_delta_aggregate,
      ),
      extension_aggregate: $ => seq(
         '(',
         $.expression,
         reservedWord('with'),
         $.record_component_association_list,
         ')',
      ),
      record_delta_aggregate: $ => seq(
         '(',
         $.expression,
         reservedWord('with'),
         reservedWord('delta'),
         $.record_component_association_list,
         ')',
      ),
      array_delta_aggregate: $ => choice(
         seq(
            '(',
            $.expression,
            reservedWord('with'),
            reservedWord('delta'),
            $.array_component_association_list,
            ')',
         ),
         seq(
            '[',
            $.expression,
            reservedWord('with'),
            reservedWord('delta'),
            $.array_component_association_list,
            ']',
         ),
      ),
      record_aggregate: $ => seq(
         '(',
         $.record_component_association_list,
         ')',
      ),
      array_component_association: $ => seq(
         $.discrete_choice_list,
         $.assoc_expression,
      ),
      array_component_association_list: $ =>
         comma_separated_list_of($.array_component_association),
      record_component_association: $ => choice(
         seq(
            $.component_choice_list,
            $.assoc_expression,
         ),
         $.expression,
      ),
      record_component_association_list: $ => choice(
         comma_separated_list_of($.record_component_association),
         seq(
            reservedWord('null'),
            reservedWord('record'),
         ),
      ),
      null_exclusion: $ => seq(
         reservedWord('not'),
         reservedWord('null'),
      ),
      index_constraint: $ => seq(
         '(',
         comma_separated_list_of($.discrete_range),
         ')',
      ),
      digits_constraint: $ => seq(
         reservedWord('digits'),
         $.simple_expression,
         optional($.range_constraint),
      ),
      delta_constraint: $ => seq(
         reservedWord('delta'),
         $.simple_expression,
         optional($.range_constraint),
      ),
      _basic_declarative_item_pragma: $ => choice(
         $._basic_declarative_item,
         $.pragma_g,
      ),
      type_declaration: $ => choice(
         $.full_type_declaration,
         $.incomplete_type_declaration,
         $.private_type_declaration,
         $.private_extension_declaration,
      ),
      full_type_declaration: $ => choice(
         seq(
            reservedWord('type'),
            $.identifier,
            optional($.known_discriminant_part),
            reservedWord('is'),
            $.type_definition,
            optional($.aspect_specification),
            ';',
         ),
//         $.task_type_declaration,
//         $.protected_type_declaration,
      ),
      private_type_declaration: $ => seq(
         reservedWord('type'),
         $.identifier,
         optional($.discriminant_part),
         reservedWord('is'),
         optional(seq(
            optional(reservedWord('abstract')),
            reservedWord('tagged'),
         )),
         optional(reservedWord('limited')),
         reservedWord('private'),
         optional($.aspect_specification),
         ';',
      ),
      private_extension_declaration: $ => seq(
         reservedWord('type'),
         $.identifier,
         optional($.discriminant_part),
         reservedWord('is'),
         optional(reservedWord('abstract')),
         optional(choice(
            reservedWord('limited'),
            reservedWord('synchronized'),
         )),
         reservedWord('new'),
         $.subtype_indication,
         optional(seq(
            reservedWord('and'),
            $.interface_list,
         )),
         reservedWord('with'),
         reservedWord('private'),
         optional($.aspect_specification),
         ';',
      ),
      discriminant_part: $ => choice(
         $.known_discriminant_part,
         $.unknown_discriminant_part,
      ),
      unknown_discriminant_part: $ => seq(
         '(',
         '<>',
         ')',
      ),
      known_discriminant_part: $ => seq(
         '(',
         $.discriminant_specification_list,
         ')',
      ),
      incomplete_type_declaration: $ => seq(
         reservedWord('type'),
         $.identifier,
         optional($.discriminant_part),
         optional(seq(
            reservedWord('is'),
            reservedWord('tagged'),
         )),
         ';',
      ),
      discriminant_specification_list: $ =>
         prec.right(list_of(';', $.discriminant_specification)),
      discriminant_specification: $ => seq(
         $.defining_identifier_list,
         ':',
         choice(
            seq(
               optional($.null_exclusion),
               $.name,
            ),
            $.access_definition,
         ),
         optional($.assign_value),
      ),
      type_definition: $ => choice(
         $.enumeration_type_definition,
         $.integer_type_definition,
         $.real_type_definition,
         $.array_type_definition,
         $.record_type_definition,
         $.access_type_definition,
         $.derived_type_definition,
         $.interface_type_definition,
      ),
      array_type_definition: $ => choice(
         $.unconstrained_array_definition,
         $.constrained_array_definition,
      ),
      unconstrained_array_definition: $ => seq(
         reservedWord('array'),
         '(',
         $._index_subtype_definition_list,
         ')',
         reservedWord('of'),
         $.component_definition,
      ),
      constrained_array_definition: $ => seq(
         reservedWord('array'),
         '(',
         $._discrete_subtype_definition_list,
         ')',
         reservedWord('of'),
         $.component_definition,
      ),
      _discrete_subtype_definition_list: $ =>
         comma_separated_list_of($.discrete_subtype_definition),
      discrete_subtype_definition: $ => choice(
         $.subtype_indication,
         $.range_g,
      ),
      discrete_range: $ => choice(  //  same as discrete_subtype_definition
         $.subtype_indication,
         $.range_g,
      ),
      _index_subtype_definition_list: $ =>
         comma_separated_list_of($.index_subtype_definition),
      index_subtype_definition: $ => seq(
         $.name,
         reservedWord('range'),
         '<>',
      ),
      enumeration_type_definition: $ => seq(
         '(',
         $._enumeration_literal_list,
         ')',
      ),
      _enumeration_literal_list: $ =>
         comma_separated_list_of($._enumeration_literal_specification),
      _enumeration_literal_specification: $ => choice(
         $.identifier,
         $.character_literal,
      ),
      integer_type_definition: $ => choice(
         $.signed_integer_type_definition,
         $.modular_type_definition,
      ),
      modular_type_definition: $ => seq(
         reservedWord('mod'),
         $.expression,
      ),
      real_type_definition: $ => choice(
         $.floating_point_definition,
         $.fixed_point_definition,
      ),
      floating_point_definition: $ => seq(
         reservedWord('digits'),
         $.expression,
         optional($.real_range_specification),
      ),
      real_range_specification: $ => seq(
         reservedWord('range'),
         $.simple_expression,
         '..',
         $.simple_expression,
      ),
      fixed_point_definition: $ => choice(
         $.ordinary_fixed_point_definition,
         $.decimal_fixed_point_definition,
      ),
      decimal_fixed_point_definition: $ => seq(
         reservedWord('delta'),
         $.expression,
         reservedWord('digits'),
         $.expression,
         optional($.real_range_specification),
      ),
      ordinary_fixed_point_definition: $ => seq(
         reservedWord('delta'),
         $.expression,
         $.real_range_specification,
      ),
      signed_integer_type_definition: $ => seq(
         reservedWord('range'),
         $.simple_expression,
         '..',
         $.simple_expression,
      ),
      derived_type_definition: $ => seq(
         optional(reservedWord('abstract')),
         optional(reservedWord('limited')),
         reservedWord('new'),
         $.subtype_indication,
         optional(seq(
            optional(seq(
               reservedWord('and'),
               $.interface_list,
            )),
            $.record_extension_part,
         )),
      ),
      interface_type_definition: $ => seq(
         optional(choice(
            reservedWord('limited'),
            reservedWord('task'),
            reservedWord('protected'),
            reservedWord('synchronized'),
         )),
         reservedWord('interface'),
         optional(seq(
            reservedWord('and'),
            $.interface_list,
         )),
      ),
      interface_list: $ =>
         list_of(reservedWord('and'), $.name),
      record_extension_part: $ => seq(
         reservedWord('with'),   // record_extension_part in Ada grammar
         $.record_definition,
      ),
      record_type_definition: $ => seq(
         optional(seq(
            optional(reservedWord('abstract')),
            reservedWord('tagged'),
         )),
         optional(reservedWord('limited')),
         $.record_definition,
      ),
      record_definition: $ => choice(
         seq(
            reservedWord('record'),
            $.component_list,
            reservedWord('end'),
            reservedWord('record'),
            optional($.identifier),
         ),
         seq(
            reservedWord('null'),
            reservedWord('record'),
         ),
      ),
      component_list: $ => choice(
         repeat1($.component_item),
         seq(
            optional($.component_item),
            $.variant_part,
         ),
         seq(
            reservedWord('null'),
            reservedWord(';'),
         ),
      ),
      component_item: $ => choice(
         $.component_declaration,
         $.aspect_clause,
      ),
      component_declaration: $ => seq(
         $.defining_identifier_list,
         ':',
         $.component_definition,
         optional($.assign_value),
         optional($.aspect_specification),
         ';'
      ),
      component_definition: $ => seq(
         optional(reservedWord('aliased')),
         choice(
            $.subtype_indication,
            $.access_definition,
         ),
      ),
      array_aggregate: $ => choice(
         $.positional_array_aggregate,
         $.null_array_aggregate,
         $.named_array_aggregate,
      ),
      positional_array_aggregate: $ => choice(
         seq(
            '(',
            $.expression_list,
            optional(seq(
               ',',
               reservedWord('others'),
               $.assoc_expression,
            )),
            ')',
         ),
         seq(
            '[',
            $.expression_list,
            optional(seq(
               ',',
               reservedWord('others'),
               $.assoc_expression,
            )),
            ']',
         ),
      ),
      null_array_aggregate: $ => seq(
         '[',
         ']',
      ),
      named_array_aggregate: $ => choice(
         seq(
            '(',
            $._array_component_association_list,
            ')',
         ),
         seq(
            '[',
            $._array_component_association_list,
            ']',
         ),
      ),
      _array_component_association_list: $ =>
         comma_separated_list_of($.array_component_association),
      array_component_association: $ => choice(
         seq(
            $.discrete_choice_list,
            $.assoc_expression,
         ),
         $.iterated_element_association,
      ),
      discrete_choice_list: $ => list_of('|', $.discrete_choice),
      discrete_choice: $ => choice(
         $.expression,
         $.subtype_indication,
         $.range_g,
         reservedWord('others'),
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
         reservedWord('with'),
         $.aspect_mark_list,
      ),
      assign_value: $ => seq(
         ':=',
         $.expression,
      ),
      at_clause: $ => seq(
         reservedWord('for'),
         $._direct_name,
         reservedWord('use'),
         reservedWord('at'),
         $.expression,
         ';',
      ),
      attribute_definition_clause: $ => seq(
         reservedWord('for'),
         $.name,
         $.tick,
         $.attribute_designator,
         reservedWord('use'),
         $.expression,
         ';',
      ),
      body_stub: $ => choice(
         $.subprogram_body_stub,
         $.package_body_stub,
         $.task_body_stub,
         $.protected_body_stub,
      ),
      subprogram_body_stub: $ => seq(
         optional($.overriding_indicator),
         $.subprogram_specification,
         reservedWord('is'),
         reservedWord('separate'),
         optional($.aspect_specification),
         ';',
      ),
      package_body_stub: $ => seq(
         reservedWord('package'),
         reservedWord('body'),
         $.identifier,
         reservedWord('is'),
         reservedWord('separate'),
         optional($.aspect_specification),
         ';',
      ),
      task_body: $ => seq(
         reservedWord('task'),
         reservedWord('body'),
         $.identifier,
         optional($.aspect_specification),
         reservedWord('is'),
         optional($.non_empty_declarative_part),
         reservedWord('begin'),
         $.handled_sequence_of_statements,
         reservedWord('end'),
         optional($.identifier),
         ';',
      ),
      task_body_stub: $ => seq(
         reservedWord('task'),
         reservedWord('body'),
         $.identifier,
         reservedWord('is'),
         reservedWord('separate'),
         optional($.aspect_specification),
         ';',
      ),
      protected_body_stub: $ => seq(
         reservedWord('protected'),
         reservedWord('body'),
         $.identifier,
         reservedWord('is'),
         reservedWord('separate'),
         optional($.aspect_specification),
         ';',
      ),
      choice_parameter_specification: $ => $.identifier,  // ??? inline
      component_clause: $ => seq(
         $.name,
         reservedWord('at'),
         field('position', $.expression),
         reservedWord('range'),
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
         reservedWord('entry'),
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
         reservedWord('for'),
         $.name,
         reservedWord('use'),
         $.enumeration_aggregate,
         ';',
      ),
      exception_choice_list: $ => list_of('|', $.exception_choice),
      exception_choice: $ => choice(
         $.name,
         reservedWord('others'),
      ),
      exception_declaration: $ => seq(
         $.defining_identifier_list,
         ':',
         reservedWord('exception'),
         optional($.aspect_specification),
         ';',
      ),
      exception_handler: $ => seq(
         reservedWord('when'),
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
      formal_part: $ => seq(
         '(',
         $.parameter_specification_list,
         ')',
      ),
      function_specification: $ => seq(
         reservedWord('function'),
         $.name,
         $.parameter_and_result_profile,
      ),
      generic_declaration: $ => choice(
         $.generic_subprogram_declaration,
         $.generic_package_declaration,
      ),
      generic_formal_part: $ => seq(
         reservedWord('generic'),
         repeat($.generic_formal_parameter_declaration),
      ),
      generic_formal_parameter_declaration: $ => choice(
         $.formal_object_declaration,
         $.formal_type_declaration,
         $.formal_subprogram_declaration,
         $.formal_package_declaration,
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
            reservedWord('package'),
            seq(
               optional($.overriding_indicator),
               choice(
                  reservedWord('procedure'),
                  reservedWord('function'),
               ),
            ),
         ),
         $.name,
         reservedWord('is'),
         reservedWord('new'),
         $.name,   //  includes the generic_actual_part
         optional($.aspect_specification),
         ';',
      ),
      formal_object_declaration: $ => choice(
         seq(
            $.defining_identifier_list,
            ':',
            optional($.non_empty_mode),
            optional($.null_exclusion),
            $.name,
            optional($.assign_value),
            optional($.aspect_specification),
            ';',
         ),
         seq(
            $.defining_identifier_list,
            ':',
            optional($.non_empty_mode),
            $.access_definition,
            optional($.assign_value),
            optional($.aspect_specification),
            ';',
         ),
      ),
      formal_type_declaration: $ => choice(
         $.formal_complete_type_declaration,
         $.formal_incomplete_type_declaration,
      ),
      formal_complete_type_declaration: $ => seq(
         reservedWord('type'),
         $.identifier,
         optional($.discriminant_part),
         reservedWord('is'),
         $.formal_type_definition,
         optional(seq(
            reservedWord('or'),
            reservedWord('use'),
            $.name,
         )),
         optional($.aspect_specification),
         ';',
      ),
      formal_incomplete_type_declaration: $ => seq(
         reservedWord('type'),
         $.identifier,
         optional($.discriminant_part),
         optional(seq(
            reservedWord('is'),
            reservedWord('tagged'),
         )),
         optional(seq(
            reservedWord('or'),
            reservedWord('use'),
            $.name,
         )),
         ';',
      ),
      formal_type_definition: $ => choice(
         $.formal_private_type_definition,
         $.formal_derived_type_definition,
         $.formal_discrete_type_definition,
         $.formal_signed_integer_type_definition,
         $.formal_modular_type_definition,
         $.formal_floating_point_definition,
         $.formal_ordinary_fixed_point_definition,
         $.formal_decimal_fixed_point_definition,
         $.formal_array_type_definition,
         $.formal_access_type_definition,
         $.formal_interface_type_definition,
      ),
      formal_private_type_definition: $ => seq(
         optional(seq(
            optional(reservedWord('abstract')),
            reservedWord('tagged'),
         )),
         optional(reservedWord('limited')),
         reservedWord('private'),
      ),
      formal_derived_type_definition: $ => seq(
         optional(reservedWord('abstract')),
         optional(choice(
            reservedWord('limited'),
            reservedWord('synchronized'),
         )),
         reservedWord('new'),
         $.name,
         optional(seq(
            optional(seq(
               reservedWord('and'),
               $.interface_list,
            )),
            reservedWord('with'),
            reservedWord('private'),
         )),
      ),
      formal_discrete_type_definition: $ => seq(
         '(',
         '<>',
         ')',
      ),
      formal_signed_integer_type_definition: $ => seq(
         reservedWord('range'),
         '<>',
      ),
      formal_modular_type_definition: $ => seq(
         reservedWord('mod'),
         '<>',
      ),
      formal_floating_point_definition: $ => seq(
         reservedWord('digits'),
         '<>',
      ),
      formal_ordinary_fixed_point_definition: $ => seq(
         reservedWord('delta'),
         '<>',
      ),
      formal_decimal_fixed_point_definition: $ => seq(
         reservedWord('delta'),
         '<>',
         reservedWord('digits'),
         '<>',
      ),
      formal_array_type_definition: $ => $.array_type_definition,
      formal_access_type_definition: $ => $.access_type_definition,
      formal_interface_type_definition: $ => $.interface_type_definition,
      formal_subprogram_declaration: $ => choice(
         $.formal_concrete_subprogram_declaration,
         $.formal_abstract_subprogram_declaration,
      ),
      formal_concrete_subprogram_declaration: $ => seq(
         reservedWord('with'),
         $.subprogram_specification,
         optional(seq(
            reservedWord('is'),
            $.subprogram_default,
         )),
         optional($.aspect_specification),
         ';',
      ),
      formal_abstract_subprogram_declaration: $ => seq(
         reservedWord('with'),
         $.subprogram_specification,
         reservedWord('is'),
         reservedWord('abstract'),
         optional($.subprogram_default),
         optional($.aspect_specification),
         ';',
      ),
      subprogram_default: $ => choice(
         field('default_name', $.name),
         '<>',
         reservedWord('null'),
      ),
      formal_package_declaration: $ => seq(
         reservedWord('with'),
         reservedWord('package'),
         $.identifier,
         reservedWord('is'),
         reservedWord('new'),
         $.name,
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
         reservedWord('overriding'),
      ),
      global_set: $ => prec.left(
         comma_separated_list_of($.name),   // ??? name_list
      ),
      handled_sequence_of_statements: $ => seq(
         $.sequence_of_statements,
         optional(seq(
            reservedWord('exception'),
            $.exception_handler_list,
         )),
      ),
      loop_label: $ => seq(    // matches label_opt in ada-mode grammar
         field('statement_identifier', $._direct_name),
         ':',
      ),
      label: $ => seq(
         '<<',
         field('statement_identifier', $._direct_name),
         '>>',
      ),
      mod_clause: $ => seq(
         reservedWord('at'),
         reservedWord('mod'),
         $.expression,
         ';',
      ),
      non_empty_mode: $ => choice(
         reservedWord('in'),
         seq(
            reservedWord('in'),
            reservedWord('out'),
         ),
         reservedWord('out'),
      ),
      null_procedure_declaration: $ => seq(
         optional($.overriding_indicator),
         $.procedure_specification,
         reservedWord('is'),
         reservedWord('null'),
         optional($.aspect_specification),
         ';',
      ),
      null_statement: $ => seq(
         reservedWord('null'),
         ';',
      ),
      number_declaration: $ => seq(
         $.defining_identifier_list,
         ';',
         reservedWord('constant'),
         $.assign_value,
         ';',
      ),
      object_declaration: $ => choice(
         seq(
            $.defining_identifier_list,
            ':',
            optional(reservedWord('aliased')),
            optional(reservedWord('constant')),
            choice(
               $.subtype_indication,
               $.access_definition,
               $.array_type_definition,
            ),
            optional($.assign_value),
            optional($.aspect_specification),
            ';',
         ),
         $.single_task_declaration,
//         $.single_protected_declaration,
      ),
      single_task_declaration: $ => seq(
         reservedWord('task'),
         $.identifier,
         optional($.aspect_specification),
         optional(seq(
            reservedWord('is'),
            optional(seq(
               reservedWord('new'),
               $.interface_list,
               reservedWord('with'),
            )),
            $.task_definition,
         )),
         ';',
      ),
      entry_declaration: $ => seq(
         optional($.overriding_indicator),
         reservedWord('entry'),
         $.identifier,
         optional(seq(
            '(',
            $.discrete_subtype_definition,
            ')',
         )),
         field('parameter_profile', optional($.formal_part)),
         optional($.aspect_specification),
         ';',
      ),
      task_item: $ => choice(
         $.entry_declaration,
         $.aspect_clause,
      ),
      task_definition: $ => seq(
         repeat1($.task_item),
         optional(seq(
            reservedWord('private'),
            repeat1($.task_item),
         )),
         reservedWord('end'),
         optional($.identifier),
      ),
      overriding_indicator: $ => seq(
         optional(reservedWord('not')),
         reservedWord('overriding'),
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
         optional(reservedWord('aliased')),
         optional($.non_empty_mode),
         optional($.null_exclusion),
         $.name,
         optional($.assign_value),
      ),
      parameter_specification_list: $ => list_of(
         ';',
         $.parameter_specification,
      ),
      pragma_g: $ => seq(
         reservedWord('pragma'),
         $.identifier,
         optional(seq(
            '(',
            choice(
               comma_separated_list_of($.pragma_argument_association),
               $.conditional_quantified_expression,
            ),
            ')',
         )),
         ';'
      ),
      pragma_argument_association: $ => seq(
         optional(seq(
            $.aspect_mark,
            '=>',
         )),
         $.expression,
      ),
      if_expression: $ => seq(
         reservedWord('if'),
         field('condition', $.expression),
         reservedWord('then'),
         $.expression,
         repeat($.elsif_expression_item),
         optional(seq(
            reservedWord('else'),
            $.expression,
         )),
      ),
      elsif_expression_item: $ => seq(
         reservedWord('elsif'),
         field('condition', $.expression),
         reservedWord('then'),
         $.expression,
      ),
      procedure_specification: $ => seq(
         reservedWord('procedure'),
         $.name,
         optional($.non_empty_parameter_profile),
      ),
      record_representation_clause: $ => prec.left(seq(
         reservedWord('for'),
         $.name,
         reservedWord('use'),
         reservedWord('record'),
         optional($.mod_clause),
         repeat($.component_clause),
         reservedWord('end'),
         reservedWord('record'),
         optional($.name),
         ';',
      )),
      renaming_declaration: $ => choice(
         $.object_renaming_declaration,
         $.exception_renaming_declaration,
         $.package_renaming_declaration,
         $.subprogram_renaming_declaration,
         $.generic_renaming_declaration,
      ),
      object_renaming_declaration: $ => choice(
         seq(
            $.identifier,
            optional(seq(
               ':',
               optional($.null_exclusion),
               $.name,
            )),
            reservedWord('renames'),
            $.name,
            optional($.aspect_specification),
            ';',
         ),
         seq(
            $.identifier,
            ':',
            $.access_definition,
            reservedWord('renames'),
            $.name,
            optional($.aspect_specification),
            ';',
         ),
      ),
      exception_renaming_declaration: $ => seq(
         $.identifier,
         ':',
         reservedWord('exception'),
         reservedWord('renames'),
         $.name,
         optional($.aspect_specification),
         ';',
      ),
      package_renaming_declaration: $ => seq(
         reservedWord('package'),
         $.name,
         reservedWord('renames'),
         $.name,
         optional($.aspect_specification),
         ';',
      ),
      subprogram_renaming_declaration: $ => seq(
         optional($.overriding_indicator),
         $.subprogram_specification,
         reservedWord('renames'),
         $.name,
         optional($.aspect_specification),
         ';',
      ),
      generic_renaming_declaration: $ => choice(
         seq(
            reservedWord('generic'),
            reservedWord('package'),
            $.name,
            reservedWord('renames'),
            $.name,
            optional($.aspect_specification),
            ';',
         ),
         seq(
            reservedWord('generic'),
            reservedWord('procedure'),
            $.name,
            reservedWord('renames'),
            $.name,
            optional($.aspect_specification),
            ';',
         ),
         seq(
            reservedWord('generic'),
            reservedWord('function'),
            $.name,
            reservedWord('renames'),
            $.name,
            optional($.aspect_specification),
            ';',
         ),
      ),
      result_profile: $ => seq(
         reservedWord('return'),
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
         $.assignment_statement,
         $.exit_statement,
         $.goto_statement,
         $.procedure_call_statement,
         $.simple_return_statement,
//         $.requeue_statement,
         $.delay_statement,
//         $.abort_statement,
         $.raise_statement,
         $.pragma_g,
      ),
      statement: $ => seq(
         repeat($.label),
         choice(
            $.simple_statement,
            $.compound_statement,
         ),
      ),
      compound_statement: $ => choice(
         $.if_statement,
         $.case_statement,
         $.loop_statement,
         $.block_statement,
         $.extended_return_statement,
//         $.parallel_block_statement,
         $.accept_statement,
         $.select_statement,
      ),
      select_statement: $ => choice(
         $.selective_accept,
         $.timed_entry_call,
         $.conditional_entry_call,
//         $.asynchronous_select,
      ),
      entry_call_alternative: $ => seq(
         $.procedure_call_statement,
         optional($.sequence_of_statements),
      ),
      conditional_entry_call: $ => seq(
         reservedWord('select'),
         $.entry_call_alternative,
         reservedWord('else'),
         $.sequence_of_statements,
         reservedWord('end'),
         reservedWord('select'),
         ';',
      ),
      delay_alternative: $ => seq(
         $.delay_statement,
         optional($.sequence_of_statements)
      ),
      timed_entry_call: $ => seq(
         reservedWord('select'),
         $.entry_call_alternative,
         reservedWord('or'),
         $.delay_alternative,
         reservedWord('end'),
         reservedWord('select'),
         ';',
      ),
      guard: $ => seq(
         reservedWord('when'),
         field('condition', $.expression),
         '=>',
      ),
      guard_select: $ => seq(
         $.guard,
         $.select_alternative,
      ),
      select_alternative: $ => seq(
         $.accept_statement,
         optional($.sequence_of_statements),
      ),
      selective_accept: $ => seq(
         reservedWord('select'),
         list_of(reservedWord('or'), $.guard_select),
         optional(seq(
            reservedWord('else'),
            $.sequence_of_statements,
         )),
         reservedWord('end'),
         reservedWord('select'),
         reservedWord(';'),
      ),
      accept_statement: $ => seq(
         reservedWord('accept'),
         $._direct_name,
         optional(seq(
            '(',
            field('entry_index', $.expression),
            ')',
         )),
         field('parameter_profile', optional($.formal_part)),
         optional(seq(
            reservedWord('do'),
            $.handled_sequence_of_statements,
            reservedWord('end'),
            optional($.identifier),
         )),
         ';',
      ),
      case_statement_alternative: $ => seq(
         reservedWord('when'),
         $.discrete_choice_list,
         '=>',
         $.sequence_of_statements,
      ),
      case_statement: $ => seq(
         reservedWord('case'),
         $.expression,
         reservedWord('is'),
         repeat1($.case_statement_alternative),
         reservedWord('end'),
         reservedWord('case'),
         ';',
      ),
      block_statement: $ => seq(
         optional($.loop_label),
         optional(seq(
            reservedWord('declare'),
            optional($.non_empty_declarative_part),
         )),
         reservedWord('begin'),
         $.handled_sequence_of_statements,
         reservedWord('end'),
         optional($.identifier),
         ';',
      ),
      if_statement: $ => seq(
         reservedWord('if'),
         field('condition', $.expression),
         reservedWord('then'),
         $.sequence_of_statements,
         repeat($.elsif_statement_item),
         optional(seq(
            reservedWord('else'),
            $.sequence_of_statements,
         )),
         reservedWord('end'),
         reservedWord('if'),
         ';',
      ),
      elsif_statement_item: $ => seq(
         reservedWord('elsif'),
         field('condition', $.expression),
         reservedWord('then'),
         $.sequence_of_statements,
      ),
      exit_statement: $ => seq(
         reservedWord('exit'),
         optional($.name),
         optional(seq(
            reservedWord('when'),
            field('condition', $.expression),
         )),
         ';',
      ),
      goto_statement: $ => seq(
         reservedWord('goto'),
         $.name,
         ';',
      ),
      delay_statement: $ => choice(
         $.delay_until_statement,
         $.delay_relative_statement,
      ),
      delay_until_statement: $ => seq(
         reservedWord('delay'),
         reservedWord('until'),
         $.expression,
         ';',
      ),
      delay_relative_statement: $ => seq(
         reservedWord('delay'),
         $.expression,
         ';',
      ),
      simple_return_statement: $ => seq(
         reservedWord('return'),
         optional($.expression),
         ';',
      ),
      extended_return_statement: $ => seq(
         reservedWord('return'),
         $.extended_return_object_declaration,
         optional(seq(
            reservedWord('do'),
            $.handled_sequence_of_statements,
            reservedWord('end'),
            reservedWord('return'),
         )),
         ';',
      ),
      extended_return_object_declaration: $ => seq(
         $.identifier,
         ':',
         optional(reservedWord('aliased')),
         optional(reservedWord('constant')),
         $.return_subtype_indication,
         optional($.assign_value),
      ),
      return_subtype_indication: $ => choice(
         $.subtype_indication,
         $.access_definition,
      ),
      procedure_call_statement: $ => seq(
         $.name,
         optional($.actual_parameter_part),
         ';',
      ),
      raise_statement: $ => seq(
         reservedWord('raise'),
         optional(seq(
            $.name,
            optional(seq(
               reservedWord('with'),
               $.expression,  // ada-mode allows "raise CE with raise with ..."
            )),
         )),
         ';',
      ),
      loop_statement: $ => seq(
         optional($.loop_label),
         optional($.iteration_scheme),
         reservedWord('loop'),
         $.sequence_of_statements,
         reservedWord('end'),
         reservedWord('loop'),
         optional($.identifier),
         ';',
      ),
      iteration_scheme: $ => choice(
         seq(
            reservedWord('while'),
            field('condition', $.expression),
         ),
         seq(
            reservedWord('for'),
            choice(
               $.loop_parameter_specification,
               $.iterator_specification,
            ),
         ),
//         seq(
//            optional(reservedWord('parallel')),
//            reservedWord('for'),
//            $.procedural_iterator,
//         ),
//         seq(
//            reservedWord('parallel'),
//            optional(seq(
//               '(',
//               $.chunk_specification,
//               ')',
//            )),
//            reservedWord('for'),
//            choice(
//               $.loop_parameter_specification,
//               $.iterator_specification,
//            ),
//         ),
      ),
      assignment_statement: $ => seq(
         $.name,
         $.assign_value,
         ';',
      ),
      subprogram_declaration: $ => seq(
         optional($.overriding_indicator),
         $.subprogram_specification,
         field('is_abstract', optional(seq(
            reservedWord('is'),
            reservedWord('abstract'),
         ))),
         optional($.aspect_specification),
         ';',
      ),
      expression_function_declaration: $ => seq(
         optional($.overriding_indicator),
         $.function_specification,
         reservedWord('is'),
         $.aggregate,
         optional($.aspect_specification),
         ';',
      ),
      subprogram_specification: $ => choice(
         $.procedure_specification,
         $.function_specification,
      ),
      subtype_declaration: $ => seq(
         reservedWord('subtype'),
         $.identifier,
         reservedWord('is'),
         $.subtype_indication,
         optional($.aspect_specification),
         ';',
      ),
      variant_part: $ => seq(
         reservedWord('case'),
         $._direct_name,
         reservedWord('is'),
         $.variant_list,
         reservedWord('end'),
         reservedWord('case'),
         ';',
      ),
      variant_list: $ => repeat1($.variant),
      variant: $ => seq(
         reservedWord('when'),
         $.discrete_choice_list,
         '=>',
         $.component_list,
      ),
   }
});
