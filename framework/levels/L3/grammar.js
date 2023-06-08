module.exports = grammar({
	name: 'L3',
	
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
				$.constant_declaration,
				$.data_declaration
			),
		
		constant_declaration: $ =>
			seq('const', $.constant, $.number),

		data_declaration: $ =>
			seq('data', $.data, $.string),

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
				$.goto,
				$.variable,
				$.scope
			),
		
		scope: $ =>
			seq('{',
				repeat1(
					seq(
						optional($.label),
						choice(
							$.syscall,
							$.assignment,
							$.goto,
							$.variable,
							$.scope,
						),
						';', 
						optional('\n')
					)
				)
			,'}'),

		assignment: $ =>
			seq($.writer, choice(':=',"?="), $.expression),

		goto: $ =>
			seq("goto", choice($.register, $.label)),

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
				$.register,
				$.memory,
				$.number,
				$.variable_name,
				$.label,
				$.constant,
				$.data
			),		

		writer: $ =>
			choice(
				$.register,
				$.memory
			),

		memory_access: $ =>
			choice(
				$.register,
				$.constant,
				$.data,
				$.number
			),

		memory: $ => seq('[', $.memory_access, ',', $.type, ']'),

		type: () => /i8|i16|i32|i64|u8|u16|u32|u64|f8|f16|f32|f64/,

		constant: () => /@[_a-zA-Z]+/,

		data: () => /&[_a-zA-Z]+/,

		label: () => /#[A-Z]+/,

		register: () => /\$[x,y,i,j,k,l,m,n,?,!]/,

		syscall: () => 'syscall',

		operator: () => /[+-/\*|&><=]+/,

		number: () => /[0-9]+/,

		string: () => /".+"/,

		variable_name: () => /[_a-zA-Z]+/,

		//address: () => /[a-zA-Z_]+/,
	}
});