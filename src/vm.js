/////////
const _writable_memory = 7000;
const _free_memory_pointer = 7000;

class VirtualMachine {
    constructor(program, memory, registers) {
        this.registers = registers
        this.memory = memory
        this.program = program
        /*
        l = this.program.data
        10 == this.program.data_pointers["hello_world_string"]
        this.memory[10] == this.program.data[10]
        */
        // copyt this.program.data to memory
    }

    state = {
        labels: {},
        cs: {},
        data: {},
        registers: {
            "$!":0, //PC
            "$?":0, //Bool
            "$x":0,
            "$y":0,
            "$j":0
        },
        memory: new Array(10000),
        writable_memory: _writable_memory,
        free_memory_pointer: _free_memory_pointer
    }


    execute_bytecode() {
        var pc = this.state.registers['$!'];
        this.program.instructions[pc].handle(this);
        this.state.registers['$!']++;
    }

    assign_binary(cond, writer, reader1, opr, reader2){
        if (cond && this.check_condition()) return;
        let RHS = evaluate_binary(reader1,opr,reader2);
        this.write(writer, RHS);
    }
    
    assign_unary(cond, writer, opr, reader){
        if (cond && this.check_condition()) return;
        let RHS = evaluate_unary(opr,reader);
        this.write(writer, RHS);
    }
    
    assign(cond, writer, reader){
        if (cond && this.check_condition()) return;
        let RHS = this.read(reader);
        this.write(writer, RHS);
    }
    
    evaluate_binary(v1, opr, v2){
        return eval(`${this.read(v1)} ${opr} ${this.read(v2)}`);
    }
    
    evaluate_unary(opr, v){
        return eval(`${opr} ${this.read(v)}`);
    }

    check_condition() {
        return this.state.registers['$?'];
    }
    
    write(writer, RHS){
        switch(writer.type){
            case WT.MEMORY:
                throw new Error("Memorye error");
                // var register = writer.child(1).text;
                // var bytes = parseInt(writer.child(3).text);
                // var expression_result = handle_expression(expression);
                // var is_number = parseInt(expression_result);
                // var startIndex = state.registers[register];
                // if (startIndex + bytes > state.writable_memory) { 
                //     console.warn("Memory out of bounds");
                //     break;
                // }
                // if (!isNaN(is_number)) {
                //     state.memory[state.registers[register]] = expression_result;
                //     return;
                // }
                // for (var i = 0; i < bytes; i++) {
                //     state.memory[i+startIndex] = expression_result.charAt(i);
                // }
                // state.memory[bytes]=null; // string terminal    
                break;
            case WT.REGISTER:
                if (writer.id in this.state.registers){
                    this.state.registers[writer.id] = RHS;
                }else {
                    throw new Error("Tried to write to a register that does not exist");
                } 
                break;
        }
    }
    
    read(reader){
        switch(reader.type){
            case RT.REGISTER:
                if (reader.id in this.state.registers){
                    return this.state.registers[reader.id];
                }
                throw new Error("Register ",reader.id," not found");
            case RT.MEMORY:
                // var startIndex = state.registers[reader.child(0).child(0).child(1).text];
                // var stopIndex = startIndex + parseInt(reader.child(0).child(0).child(3).text);
                // var result = "";
                // if (stopIndex < state.memory.length) {
                //     for (var i = startIndex; i < stopIndex; i++) {
                //         result += state.memory[i];
                //     }
                //     return result;        
                // }
                throw new Error("Memory out of bounds");
            case RT.CONSTANT:
                if (reader.id in this.state.cs){
                    return parseInt(this.state.cs[reader.id]);
                }
                throw new Error("Constant ",reader.id," not found");
            case RT.DATA:
                if (reader.id in this.state.data){
                    return this.state.data[reader.id];
                }
                throw new Error("Data ",reader.id," not found")
            case RT.LABEL:
                if (reader.id in this.state.labels){
                    return this.state.labels[reader.id];
                }
                throw new Error("Label ",reader.id," not found")
            case RT.NUMBER:
                //the number that the reader holds, is the id in this case
                return reader.id;
        }
    }
    
    handle_syscall(){
        switch(this.state.registers["$x"]) {
            case 0: // print int
                console.log(this.state.memory[this.state.registers["$y"]]);
                break;
            case 1: // print str
                var idx = this.state.registers["$y"];
                var str = "";
                while(this.state.memory[idx] != null) {
                    str += this.state.memory[idx];
                    idx++;
                }
                console.log(str);
                break;
            default:
                console.log("Syscall Error");
        }
    }
}
/*
// bytecode: (enum: OP, int: line_number, array?: operands)
function execute_bytecode(bytecode){
    bytecode.handle(this);
    /*let skip_conditional = !state.registers["$?"];
    switch(op_code){
        case OP.DEC_CONST:
            return;
        case OP.DEC_DATA:
            return;
        case OP.LABEL:
            set_label(operands)
            return;
        case OP.SYSCALL:
            handle_syscall();
            return;
        case OP.ASSIGN_BIN:
            assign_binary(operands);
            return;
        case OP.ASSIGN_UN:
            let [writer, opr, reader] = operands;
            assign_unary(writer, opr, reader);
            return;
        case OP.ASSIGN:
            assign(operands);
            return;
        case OP.COND_BIN:
            if(skip_conditional) return;
            assign_binary(operands);
            return;
        case OP.COND_UN:
            if(skip_conditional) return;
            assign_unary(operands);
            return;
        case OP.COND:
            if(skip_conditional) return;
            assign(operands);
            return;
    }
    
}*/


// function handle_binary(v_left,opr,v_right){
//     switch(opr){
//         case '+':
//             return v_left + v_right;
//         case '-':
//             return v_left - v_right;
//         case '*':
//             return v_left * v_right;
//         case '/':
//             return v_left / v_right;
//         case '|':
//             return v_left || v_right ;
//         case '&':
//             return v_left && v_right;
//         case '>':
//             return v_left > v_right;
//         case '<':
//             return v_left < v_right;
//         case '=':
//             return v_left == v_right;
//     }
//     console.log(console.error("reeee"));
//     throw new Error("Operator:",oper," unknown")
// }

// function handle_unary(oper,v){
//     switch(oper.text){
//         case '-':
//             return -v;
//         case '&':
//             return 0; //Not implemented
//     }
// }

// function handle_expression(expression){
//     var numOfChildren = expression.childCount;
//     switch(numOfChildren){
//         case 1: // reader
//             return handle_reader(expression.child(0));
//         case 2: // oper, reader
//             return handle_unary(expression.child(0),handle_reader(expression.child(1)));
//         case 3: // reader, oper, reader
//             return handle_binary(handle_reader(expression.child(0)), expression.child(1), handle_reader(expression.child(2)))
//     }
// }

// function handle_writer(statement){
//     var writer = statement.child(0).child(0).child(0);
//     var expression = statement.child(2); 
//     switch(writer.type){
//         case 'memory':
//             var register = writer.child(1).text;
//             var bytes = parseInt(writer.child(3).text);
//             var expression_result = handle_expression(expression);
//             var is_number = parseInt(expression_result);
//             var startIndex = state.registers[register];
//             if (startIndex + bytes > state.writable_memory) { 
//                 console.warn("Memory out of bounds");
//                 break;
//             }
//             if (!isNaN(is_number)) {
//                 state.memory[state.registers[register]] = expression_result;
//                 return;
//             }
//             for (var i = 0; i < bytes; i++) {
//                 state.memory[i+startIndex] = expression_result.charAt(i);
//             }
//             state.memory[bytes]=null; // string terminal    
//             break;
//         case 'register':
//             state.registers[writer.text.toString()] = handle_expression(expression);
//             break;
//     }
// }



// function handle_statement(statement){
//     if(statement.childCount == 1 && statement.text == 'syscall'){
//         handle_syscall(statement.child(0));
//     }else{
//         if(statement.child(1).type.toString() == ':='){
//             handle_writer(statement);
//         }else if(statement.child(1).type.toString() == '?='){
//             if(!state.registers['$?']) return;
//             handle_writer(statement);
//         }
//     }
// }

// function handle_declaration(declaration){
//     let type = declaration.child(0).text;
//     let [declarator, value] = declaration.child(1).text.split(' ');
//     let bytes = value.split("").length;

//     if (bytes + state.free_memory_pointer > state.memory.length) {
//         console.warn("Declation: Memory out of bounds")
//         return;
//     }

//     if(type == 'const'){
//         if (isNaN(parseInt(value))) {
//             console.error("Const can only be assigned numbers.");
//             return;
//         }
//         state.memory[state.free_memory_pointer] = value;
//         state.cs[declarator] = state.free_memory_pointer;
//         state.free_memory_pointer++;
//     }else if(type == 'data'){
//         state.data[declarator] = state.free_memory_pointer;
//         for (var i = 0; i < bytes; i++) {
//             state.memory[state.free_memory_pointer+i] = value.charAt(i);
//         }
//         state.free_memory_pointer+=bytes;
//     }
// }






