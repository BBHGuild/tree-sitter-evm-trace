module.exports = grammar({
  name: 'evm_trace',

  extras: $ => [
    /[ \t\r\n]/,
    $.comment,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.call_trace],
    [$.return_trace],
    [$.compile_entry],
  ],

  rules: {
    source_file: $ => repeat($._item),

    _item: $ => choice(
      $.header,
      $.compile_entry,
      $.status_entry,
      $.runner_entry,
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

    compile_entry: $ => choice(
      seq(alias(/[cC]ompiling \d+ files? with [^\r\n]*/, $.comment)),
      seq(
        alias(/[cC]ompiling:?/, $.keyword),
        choice($.identifier, $.labeled_address),
        choice($.hex_literal, $.identifier),
      ),
      seq(
        alias(/[cC]ompiling:?/, $.keyword),
        choice($.identifier, $.labeled_address),
      ),
    ),

    status_entry: $ => choice(
      seq(alias(/Transaction successfully executed\.?/, $.string)),
      seq(alias(/Executing previous transactions from the block\.?/, $.comment)),
      seq(alias(/No balance changes found[^\r\n]*/, $.comment)),
      seq(alias(/[gG]as used:/, $.keyword), field('amount', $.number)),
      seq(alias(/Execution result:/, $.keyword), /.*/),
      seq(alias(/=== [^\r\n=]+ ===/, $.keyword)),
    ),

    runner_entry: $ => choice(
      $.logs_block,
      seq(alias(/No files changed[^\r\n]*/, $.comment)),
      seq(alias(/Compiler[^\r\n]*/, $.comment)),
      seq(alias(/Solc [^\r\n]*/, $.comment)),
      seq(alias(/Warning[^\r\n]*/, $.comment)),
      seq(alias(/Note:[^\r\n]*/, $.comment)),
      seq(alias(/Project environment[^\r\n]*/, $.comment)),
      seq(alias(/Ran \d+ test[^\r\n]*/, $.comment)),
      seq(alias(/Ran \d+ test suite[^\r\n]*/, $.comment)),
      seq('[', alias(choice('PASS', 'FAIL'), $.keyword), ']', /.*/),
      seq(alias(/Suite result:[^\r\n]*/, $.comment)),
    ),

    logs_block: $ => prec(1, seq(
      alias('Logs:', $.keyword),
      repeat($.log_line),
    )),

    log_line: $ => token(seq(
      /[ \t]+/,
      /[^\r\n├└│→←]+/,
    )),

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
      repeat(field('arguments', $.argument_list)),
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
      optional(field('arguments', $.argument_list)),
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
          $.revert_message,
          $._value,
        ))),
      ),
      seq(
        repeat($.tree_guide),
        field('arrow', alias(choice('←', '<-'), $.return_arrow)),
        optional(field('value', choice(
          $.tuple_value,
          $._value,
        ))),
      ),
    ),


    stop_status: $ => seq(
      '[',
      alias(choice('Stop', 'Selfdestruct', 'SelfDestruct'), $.status_keyword),
      ']',
    ),

    return_status: $ => seq(
      '[',
      alias('Return', $.status_keyword),
      ']',
    ),

    revert_status: $ => seq(
      '[',
      alias(choice(
        'Revert',
        'Panic',
        'OutOfGas',
        'OutOfFunds',
        'CallTooDeep',
        'StackOverflow',
        'StackUnderflow',
        'InvalidOpcode',
        'InvalidFEOpcode',
        'InvalidJump',
        'NotActivated',
        'StateChangeDuringStaticCall',
        'CreateCollision',
        'OverflowPayment',
        'PrecompileError',
        'MemoryOOG',
        'MemoryLimitOOG',
      ), $.revert_keyword),
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
      $.string,
      $.boolean,
      $.labeled_address,
      $.custom_error,
      $.struct_value,
      $.parenthesized_tuple,
      $.array,
      $.template_value,
      $.identifier,
      $.raw_hex,
    ),

    struct_value: $ => prec(2, seq(
      optional(field('name', $.identifier)),
      '{',
      optional(seq(
        $.struct_field,
        repeat(seq(',', $.struct_field)),
        optional(','),
      )),
      '}',
    )),

    struct_field: $ => seq(
      optional(field('name', $.identifier)),
      ':',
      field('value', $._value),
    ),

    parenthesized_tuple: $ => prec(1, seq(
      '(',
      optional(seq(
        $._argument,
        repeat(seq(',', $._argument)),
        optional(','),
      )),
      ')',
    )),

    template_value: $ => /<[^>\r\n]+>/,

    raw_hex: $ => /[0-9][0-9a-fA-F]*[a-fA-F][0-9a-fA-F]*/,

    labeled_address: $ => prec(2, seq(
      field('label', $.identifier),
      optional(alias(/v[0-9]+(\.[0-9]+)*/, $.identifier)),
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
      field('estimate', alias(/[+-]?[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+|\.\./, $.estimate_value)),
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

    number: $ => /[+-]?[0-9][0-9_]*/,

    hex_literal: $ => /0x[0-9a-fA-F]*/,

    string: $ => /"([^"\\]|\\.)*"/,

    boolean: $ => choice('true', 'false'),

    identifier: $ => /[a-zA-Z_$][a-zA-Z0-9_$]*/,
  },
});
