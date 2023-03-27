// bytecode: (enum: OP, int: line_number, array?: operands)
const OP = {
    DEC_CONST: 0, // (OP.DEC_DATA, int: line_number, (string: identifier, int: data))
    DEC_DATA: 1, // (OP.DEC_DATA, int: line_number, (string: identifier, string: data))
    LABEL: 2, // (OP.LABEL, int: line_number, (string: label, int: PC_pointer))
    SYSCALL: 3, // (OP.SYSCALL, int: line_number)
    ASSIGN_BIN: 4, // (OP.ASSIGN_BIN, int: line_number, (string: writer, string: reader1, string: opr, string: reader2))
    ASSIGN_UN: 5, // (OP.ASSIGN_UN, int: line_number, (string: writer, string: opr string: reader))
    ASSIGN: 6, // (OP.ASSIGN, int: line_number, (enum: writer, string: reader))
    COND_BIN: 7, // (OP.COND_BIN, int: line_number, (enum: writer, string: reader1, string: opr, string: reader2))
    COND_UN: 8, // (OP.COND_UN, int: line_number, (enum: writer, string: opr, string: reader))
    COND: 9 // (OP.COND, int: line_number, (writer: writer, string: reader))
}

const WT = {
    REGISTER: 0,
    MEMORY: 1
}

const RT = {
    REGISTER: 0,
    MEMORY: 1,
    CONSTANT: 2,
    DATA: 3,
    LABEL: 4,
    NUMBER: 5
}

class bytecode{
    constructor(opcode, operands = []){
        this.opcode = opcode;
        this.operands = operands;
    }

    function handle(handler) {
        switch (this.opcode) {
            OP.SYSCALL: 
               return handler.syscall();
            OP.ASSIGN_BIN:
                let [w, reader1, reader2] = this.operands;
                return handler.assign_binary(false, w, reader1, reader2);
        }
    }
}

function handle(inst) {
   inst.handle({
    syscall:() => {

    },
    assign_binary: (cond, w, r1, r2) => {

    }
    })
}


class writer{
    constructor(writer_type, writer_id){
        this.type = writer_type;
        this.id = writer_id;
    }
}

class reader{
    constructor(reader_type, reader_id){
        this.type = reader_type;
        this.id = reader_id;
    }
}

class program{
    constructor(instructions, data, constants, labels){
        this.instructions = instructions;
        this.data = data;
        this.constants = constants;
        this.labels = labels;
    }
}