module.exports = grammar({
  name: 'evm_trace',

  extras: $ => [
    /[ \t\r\n]/,
    $.comment,
  ],

  conflicts: $ => [
    [$.call_trace],
    [$.return_trace],
  ],

  rules: {
    source_file: $ => repeat($._item),

    _item: $ => choice(
      $.header,
      $.call_trace,
      $.creation_trace,
      $.return_trace,
      $.emit_trace,
      $.topic_entry,
      $.data_entry,
      $.storage_header,
      $.storage_change,
    ),

    comment: $ => token(choice(
      seq('//', /.*/),
      seq('#', /.*/),
    )),

    header: $ => seq(
      alias(/[tT]races:/, $.header_keyword),
    ),

    tree_guide: $ => token(choice(
      /[├└]─+/,
      '├─',
      '└─',
      '├──',
      '└──',
      '│',
      '├',
      '└',
      '─',
      '+--',
      '\\--',
      '|',
    )),

    gas: $ => seq(
      '[',
      field('amount', $.number),
      ']',
    ),

    call_type: $ => token(choice(
      /\[call\]/,
      /\[staticcall\]/,
      /\[delegatecall\]/,
      /\[callcode\]/,
    )),

    call_trace: $ => seq(
      repeat($.tree_guide),
      optional(field('gas', $.gas)),
      optional(field('call_type_prefix', $.call_type)),
      field('call', $.call_expression),
      optional(field('call_type', $.call_type)),
    ),

    call_expression: $ => seq(
      field('target', choice($.identifier, $.hex_literal, $.labeled_address)),
      '::',
      field('function', choice($.identifier, alias(/[0-9a-fA-F]{8}/, $.hex_selector))),
      optional(field('value', $.value_transfer)),
      field('arguments', $.argument_list),
    ),

    value_transfer: $ => seq(
      '{',
      alias('value', $.keyword),
      ':',
      field('amount', $._value),
      '}',
    ),

    argument_list: $ => seq(
      '(',
      optional(seq(
        $._argument,
        repeat(seq(',', $._argument)),
        optional(','),
      )),
      ')',
    ),

    _argument: $ => choice(
      $.named_argument,
      $._value,
    ),

    named_argument: $ => seq(
      optional(field('name', $.identifier)),
      ':',
      field('value', $._value),
    ),

    creation_trace: $ => seq(
      repeat($.tree_guide),
      optional(field('gas', $.gas)),
      field('arrow', alias(choice('→', '->'), $.creation_arrow)),
      alias('new', $.keyword),
      field('contract', choice($.identifier, $.template_value)),
      optional(field('value', $.value_transfer)),
      '@',
      field('address', $.hex_literal),
    ),

    return_trace: $ => choice(
      seq(
        repeat($.tree_guide),
        field('arrow', alias(choice('←', '<-'), $.return_arrow)),
        field('status', $.stop_status),
      ),
      seq(
        repeat($.tree_guide),
        field('arrow', alias(choice('←', '<-'), $.return_arrow)),
        field('status', $.return_status),
        optional(field('value', choice(
          $.tuple_value,
          $._value,
        ))),
      ),
      seq(
        repeat($.tree_guide),
        field('arrow', alias(choice('←', '<-'), $.return_arrow)),
        field('status', $.revert_status),
        optional(field('value', choice(
          $.custom_error,
          $.revert_message,
          $._value,
        ))),
      ),
    ),

    stop_status: $ => seq(
      '[',
      alias(choice('Stop', 'Selfdestruct'), $.status_keyword),
      ']',
    ),

    return_status: $ => seq(
      '[',
      alias('Return', $.status_keyword),
      ']',
    ),

    revert_status: $ => seq(
      '[',
      alias(choice('Revert', 'Panic'), $.revert_keyword),
      ']',
    ),

    revert_message: $ => token(prec(1, /[^\r\n│├└─]+/)),

    tuple_value: $ => prec(1, seq(
      $._value,
      repeat1(seq(',', $._value)),
    )),

    custom_error: $ => prec(2, seq(
      field('name', $.identifier),
      field('arguments', $.argument_list),
    )),

    emit_trace: $ => seq(
      repeat($.tree_guide),
      alias('emit', $.keyword),
      field('name', $.identifier),
      field('arguments', $.argument_list),
    ),

    topic_entry: $ => seq(
      repeat($.tree_guide),
      optional(alias('emit', $.keyword)),
      alias('topic', $.keyword),
      field('index', $.number),
      ':',
      field('value', $.hex_literal),
    ),

    data_entry: $ => seq(
      repeat($.tree_guide),
      alias('data', $.keyword),
      ':',
      field('value', $.hex_literal),
    ),

    storage_header: $ => seq(
      repeat($.tree_guide),
      alias(token(seq('storage', /[ \t]+/, 'changes:')), $.storage_keyword),
    ),

    storage_change: $ => seq(
      repeat($.tree_guide),
      '@',
      field('slot', choice($.hex_literal, $.number, $.identifier)),
      ':',
      field('before', choice($.hex_literal, $.number)),
      field('arrow', alias(choice('→', '->'), $.change_arrow)),
      field('after', choice($.hex_literal, $.number)),
    ),

    _value: $ => choice(
      $.bytes_of_code,
      $.number_with_estimate,
      $.number,
      $.hex_literal,
      $.raw_hex,
      $.string,
      $.boolean,
      $.labeled_address,
      $.array,
      $.template_value,
      $.identifier,
    ),

    template_value: $ => /<[^>\r\n]+>/,

    raw_hex: $ => prec(1, /[0-9a-fA-F]*[a-fA-F][0-9a-fA-F]*/),

    labeled_address: $ => prec(2, seq(
      field('label', $.identifier),
      ':',
      '[',
      field('address', $.hex_literal),
      ']',
    )),

    number_with_estimate: $ => prec(2, seq(
      field('value', $.number),
      field('estimate', $.scientific_estimate),
    )),

    scientific_estimate: $ => seq(
      '[',
      field('estimate', alias(/[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+|\.\./, $.estimate_value)),
      ']',
    ),

    bytes_of_code: $ => prec(3, seq(
      choice($.number, alias('[..]', $.estimate_value)),
      alias(token(seq('bytes', /[ \t]+/, 'of', /[ \t]+/, 'code')), $.bytes_keyword),
    )),

    array: $ => seq(
      '[',
      optional(seq(
        $._value,
        repeat(seq(',', $._value)),
        optional(','),
      )),
      ']',
    ),

    number: $ => /[0-9][0-9_]*/,

    hex_literal: $ => /0x[0-9a-fA-F]*/,

    string: $ => /"([^"\\]|\\.)*"/,

    boolean: $ => choice('true', 'false'),

    identifier: $ => /[a-zA-Z_$][a-zA-Z0-9_$]*/,
  },
});
