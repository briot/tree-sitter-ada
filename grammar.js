function toCaseInsensitive(a) {
   var ca = a.charCodeAt(0);
   if (ca>=97 && ca<=122) return `[${a}${a.toUpperCase()}]`;
   if (ca>=65 && ca<= 90) return `[${a.toLowerCase()}${a}]`;
   return a;
}

function caseInsensitive (keyword) {
   //return keyword;  //  Easier to read conflict messages
   return new RegExp(keyword
      .split('')
      .map(toCaseInsensitive)
      .join('')
   )
}

module.exports = grammar({
   name: 'ada',

   extras: $ => [
      /\s|\\\r?\n/,
      $.comment,
   ],

   word: $ => $.identifier,

   rules: {
      compilation: $ => repeat(
         $.compilation_unit,
      ),

      identifier: $ => /[a-zA-Z_]\w*/,
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

      name_list: $ => repeat1($.name),
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
            '\'',
            $.attribute_designator,
         ),
//         $.reduction_attribute_reference,
      ),
//      reduction_attribute_reference: $ => seq(
//         $.value_sequence,
//         '\'',
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
         '\'',
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
         field('name', $.identifier),
         optional($.aspect_specification),
         caseInsensitive('is'),
         optional($._basic_declarative_item_list),
         optional(seq(
             caseInsensitive('private'),
             optional($._basic_declarative_item_list),
         )),
         caseInsensitive('end'),
         field('endname', optional($.identifier)),
      ),
      with_clause: $ => seq(
         field('is_limited', optional(caseInsensitive('limited'))),
         field('is_private', optional(caseInsensitive('private'))),
         caseInsensitive('with'),
         field('names', $.name_list),
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
      access_definition: $ => choice(
         seq(
            optional($.null_exclusion),
            caseInsensitive('access'),
            optional(caseInsensitive('constrant')),
            $.name,
         ),
         seq(
            optional($.null_exclusion),
            caseInsensitive('access'),
            optional(caseInsensitive('protected')),
            caseInsensitive('procedure'),
//            $.parameter_profile,
         ),
         seq(
            optional($.null_exclusion),
            caseInsensitive('access'),
            optional(caseInsensitive('protected')),
            caseInsensitive('function'),
//            $.parameter__and_result_profile,
         ),
      ),
      actual_parameter_part: $ => seq(
         '(',
         choice(
            seq(
               $.parameter_association,
               repeat(seq(
                  ',',
                  $.parameter_association,
               )),
            ),
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
//         seq(
//            $.record_component_association,
//            repeat(seq(
//               ',',
//               $.record_component_association,
//            )),
//         ),
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
//         $.discrete_range,
//         repeat1(seq(
//            ',',
//            discrete_range,
//         )),
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
//         $.pragma_g,
      ),
      _basic_declarative_item: $ => choice(
         $._basic_declaration,
         $.aspect_clause,
         $.use_clause,
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
//         optional($.aspect_specification),
         ';'
      ),
      defining_identifier_list: $ => seq(
         $.identifier,
         repeat(seq(
            ',',
            $.identifier,
         )),
      ),
      component_definition: $ => seq(
         optional(caseInsensitive('aliased')),
         choice(
            $.subtype_indication,
//            $.access_definition,
         ),
      ),


      // TODO

      abstract_subprogram_declaration: $ => 'foo1',
      aspect_clause: $ => "foo2",
      aspect_specification: $ => 'foo3',
      body_stub: $ => "foo6",
      entry_declaration: $ => 'foo7',
      exception_declaration: $ => 'foo8',
      expression_function_declaration: $ => 'foo9',
      generic_declaration: $ => 'foo10',
      generic_instantiation: $ => 'foo11',
      null_procedure_declaration: $ => 'foo24',
      number_declaration: $ => 'foo12',
      object_declaration: $ => 'foo13',
      proper_body: $ => "foo15",
      renaming_declaration: $ => 'foo16',
      statement: $   => 'foo17',
      subprogram_declaration: $ => 'foo18',
      subtype_declaration: $ => 'foo19',
      subunit: $ => 'foo20',
      use_clause: $ => "foo22",

   }
});
