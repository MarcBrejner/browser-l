const BC = {
	DEC_CONST: 0, // (BC.DEC_DATA, int: instruction_number, (string: identifier, int: data))

	DEC_DATA: 1, // (BC.DEC_DATA, int: instruction_number, (string: identifier, string: data))

	LABEL: 2, // (BC.LABEL, int: instruction_number, (string: label, int: PC_pointer))

	SYSCALL: 3, // (BC.SYSCALL, int: instruction_number)

    ASSIGN_BIN: 4, // (BC.ASSIGN_BIN, int: instruction_number, (string: writer, string: reader1, string: opr, string: reader2))
                   
    ASSIGN_UN: 5, // (BC.ASSIGN_UN, int: instruction_number, (string: writer, string: opr string: reader))

    ASSIGN: 6, // (BC.ASSIGN, int: instruction_number, (string: writer, string: reader))

    COND_BIN: 7, // (BC.COND_BIN, int: instruction_number, (string: writer, string: reader1, string: opr, string: reader2))

    COND_UN: 8, // (BC.COND_UN, int: instruction_number, (string: writer, string: opr, string: reader))

    COND: 9 // (BC.COND, int: instruction_number, (string: writer, string: reader))
}