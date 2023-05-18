module.exports = grammar({
	name: 'L2',
	
	rules: {
		source_file: $ => seq(optional($.declarations), $.statements),

		declarations: $ =>
			repeat1(
				seq($.declaration,
					';',
					'\n',
				)
			),
				
		declaration: $ =>
			choice(
				seq('const', $.constant_declaration),
				seq('data', $.data_declaration)
			),

		statements: $ => 
			repeat1(
				seq(
					optional($.label),
					$.statement, 
					';', 
					optional('\n')
				)
			),

		statement: $ =>
			choice(
				$.syscall,
				$.assignment,
				$.conditional,
				$.goto,
				$.variable
			),

		assignment: $ =>
			seq($.writer, ':=', $.expression),

		conditional: $ =>
			seq($.writer, '?=', $.expression),	

		goto: $ =>
			seq("goto", choice($.register, $.label)),assignment: $ =>
			seq($.writer, ':=', $.expression),

		variable: $ =>
			seq($.variable_name, ":", $.type, "=", $.expression),

		expression: $ =>
			choice(
				seq($.reader, $.operator, $.reader),
				seq($.operator, $.reader),
				$.reader
			),
				
		reader: $ =>
			choice(
				$.assign,
				$.datavar,
				$.number,
				$.variable_name
			),

		writer: $ =>
			choice(
				$.assign
			),
			
		assign: $ =>
			choice(
				$.register,
				$.memory
			),

		datavar: $ =>
			choice(
				$.constant,
				$.data,
				$.label
			),

		constant_declaration: $ => /@[_a-zA-Z]+\s[0-9]+/,

		data_declaration: $ => /&[_a-zA-Z]+\s".+"/,
		//constant: $ => seq('@', $.address, optional($.number)),

		constant: $ => /@[_a-zA-Z]+/,

		data: $ => /&[_a-zA-Z]+/,
		//data: $ => seq('&', $.address, choice($.number, $.string)),
	
		label: $ => /#[A-Z]+/,
		//label: $ => seq('#', $.address),

		memory: $ => seq('[', $.register, ',', $.type, ']'),

		//string: $ => seq('"', repeat(/[^"]+/), '"'),

		type: () => /i8|i16|i32|i64|u8|u16|u32|u64|f8|f16|f32|f64/,

		register: () => /\$[x,y,i,j,k,l,m,n,?,!]/,

		syscall: () => 'syscall',

		operator: () => /[+-/\*|&><=]+/,

		number: () => /[0-9]+/,

		variable_name: () => /[_a-zA-Z]+/

		//address: () => /[a-zA-Z_]+/,
	}
});