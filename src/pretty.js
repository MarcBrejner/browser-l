class PrettyPrinter {
    constructor(program) {
        this.program = program
    }

    print_program() {
        let pretty_source_code = "";
        let instructions = this.program.instructions;
        for(let i = 0; i < instructions.length; i++) {
            pretty_source_code += instructions[i].handle(this)
        }
        return pretty_source_code;
    }

    syscall() {
        return `syscall;\n` 
    }
    
    assign_binary(conditional, writer, reader1, opr, reader2) {
        var cond = conditional ? '?=' : ':=';
        return `${writer.id} ${cond} ${reader1.id} ${opr} ${reader2.id};\n` 
    }
    
    assign_unary(conditional, writer, opr, reader) {
        var cond = conditional ? '?=' : ':=';
        return `${writer.id} ${cond} ${opr} ${reader.id};\n` 
    }
    
    assign(conditional, writer, reader) {
        var cond = conditional ? '?=' : ':=';
        return `${writer.id} ${cond} ${reader.id};\n` 
    }
} 

    /*
    print_declaration_const(operands) {
        var [identifier, data] = operands;
        return `const ${identifier} ${data};\n` 
    }
    
    print_declaration_data(operands) {
        var [identifier, data] = operands;
        return `data ${identifier} ${data};\n` 
    }
    
    print_label(operands) {
        var [label, pc_pointer] = operands;
        return `#${label}\n` 
    }
    */