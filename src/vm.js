const fileUtils = require("convert-csv-to-json/src/util/fileUtils");

var pc = 0;
var running = true

// bytecode: (enum: OP, int: line_number, array?: operands)
function execute_bytecode(instruction){
    let op_code = instruction[0];
    let operands = instruction[2];
    switch(op_code){
        case BC.DEC_CONST:
            break;
        case BC.DEC_DATA:
            break;
        case BC.LABEL:
            break;
        case BC.SYSCALL:
            break;
        case BC.ASSIGN_BIN:
            break;
        case BC.ASSIGN_UN:
            break;
        case BC.ASSIGN:
            assign(operands)
            break;
        case BC.COND_BIN:
            break;
        case BC.COND_UN:
            break;
        case BC.COND:
            break;
    }
}

function declare_constant(instruction){

}

function declare_constant(instruction){

}

// (BC.LABEL, int: instruction_number, (string: label, int: PC_pointer))
function set_label(instruction){

}

// (BC.SYSCALL, int: instruction_number)
function execute_syscall(instruction){

}

// (BC.ASSIGN_BIN, int: instruction_number, (string: writer, string: reader1, string: opr, string: reader2))
function assign_binary(instruction){
    
}

function assign(operands){
    let [writer, reader] = operands;
    let RHS = read(reader);
    write(writer, RHS);
}

function write(writer, RHS){
    switch(writer.type){
        case WT.MEMORY:
            throw new Error("Memory cannot be written to, as it is not implemented");
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
            if (writer.id in state.registers){
                state.registers[reader.id] = RHS;
            }else {
                throw new Error("Tried to write to a register that does not exist");
            } 
            break;
    }
}



/////////
// const _writable_memory = 7000;
// const _free_memory_pointer = 7000;

// var state = {
//     labels: {},
//     cs: {},
//     data: {},
//     registers: {
//         "$!":0, //PC
//         "$?":0, //Bool
//         "$x":0,
//         "$y":0,
//         "$j":0
//     },
//     memory: new Array(10000),
//     writable_memory: _writable_memory,
//     free_memory_pointer: _free_memory_pointer
// }

var program = [];

function get_reader_type(reader){
    if(reader.child(0).type == 'assign' || reader.child(0).type == 'datavar'){
        return reader.child(0).child(0).type;
    } else {
        return reader.child(0).type;
    }
}

function read(reader){
    switch(reader.type){
        case RT.REGISTER:
            if (reader.id in state.registers){
                return state.registers[reader.id];
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
            throw new Error("Memory out of bounds (NOT IMPLEMENTED)");
        case RT.CONSTANT:
            if (reader.id in state.cs){
                return parseInt(state.cs[reader.id]);
            }
            throw new Error("Constant ",reader.id," not found");
        case RT.DATA:
            if (reader.id in state.data){
                return state.data[reader.id];
            }
            throw new Error("Data ",reader.id," not found")
        case RT.LABEL:
            if (reader.id in state.labels){
                return state.labels[reader.id];
            }
            throw new Error("Label ",reader.id," not found")
        case RT.NUMBER:
            //the number that the reader holds, is the id in this case
            return reader.id;
    }
}

function handle_binary(v_left,oper,v_right){
    switch(oper.text){
        case '+':
            return v_left + v_right;
        case '-':
            return v_left - v_right;
        case '*':
            return v_left * v_right;
        case '/':
            return v_left / v_right;
        case '|':
            return v_left || v_right ;
        case '&':
            return v_left && v_right;
        case '>':
            return v_left > v_right;
        case '<':
            return v_left < v_right;
        case '=':
            return v_left == v_right;
    }
    console.log(console.error("reeee"));
    throw new Error("Operator:",oper," unknown")
}

function handle_unary(oper,v){
    switch(oper.text){
        case '-':
            return -v;
        case '&':
            return 0; //Not implemented
    }
}

function handle_expression(expression){
    var numOfChildren = expression.childCount;
    switch(numOfChildren){
        case 1: // reader
            return handle_reader(expression.child(0));
        case 2: // oper, reader
            return handle_unary(expression.child(0),handle_reader(expression.child(1)));
        case 3: // reader, oper, reader
            return handle_binary(handle_reader(expression.child(0)), expression.child(1), handle_reader(expression.child(2)))
    }
}

function handle_writer(statement){
    var writer = statement.child(0).child(0).child(0);
    var expression = statement.child(2); 
    switch(writer.type){
        case 'memory':
            var register = writer.child(1).text;
            var bytes = parseInt(writer.child(3).text);
            var expression_result = handle_expression(expression);
            var is_number = parseInt(expression_result);
            var startIndex = state.registers[register];
            if (startIndex + bytes > state.writable_memory) { 
                console.warn("Memory out of bounds");
                break;
            }
            if (!isNaN(is_number)) {
                state.memory[state.registers[register]] = expression_result;
                return;
            }
            for (var i = 0; i < bytes; i++) {
                state.memory[i+startIndex] = expression_result.charAt(i);
            }
            state.memory[bytes]=null; // string terminal    
            break;
        case 'register':
            state.registers[writer.text.toString()] = handle_expression(expression);
            break;
    }
}

function handle_syscall(){
    switch(state.registers["$x"]) {
        case 0: // print int
            console.log(state.memory[state.registers["$y"]]);
            break;
        case 1: // print str
            var idx = state.registers["$y"];
            var str = "";
            while(state.memory[idx] != null) {
                str += state.memory[idx];
                idx++;
            }
            console.log(str);
            break;
        default:
            console.log("Some kind of meaningful error msg");
    }
}

function handle_statement(statement){
    if(statement.childCount == 1 && statement.text == 'syscall'){
        handle_syscall(statement.child(0));
    }else{
        if(statement.child(1).type.toString() == ':='){
            handle_writer(statement);
        }else if(statement.child(1).type.toString() == '?='){
            if(!state.registers['$?']) return;
            handle_writer(statement);
        }
    }
}

function handle_declaration(declaration){
    let type = declaration.child(0).text;
    let [declarator, value] = declaration.child(1).text.split(' ');
    let bytes = value.split("").length;

    if (bytes + state.free_memory_pointer > state.memory.length) {
        console.warn("Declation: Memory out of bounds")
        return;
    }

    if(type == 'const'){
        if (isNaN(parseInt(value))) {
            console.error("Const can only be assigned numbers.");
            return;
        }
        state.memory[state.free_memory_pointer] = value;
        state.cs[declarator] = state.free_memory_pointer;
        state.free_memory_pointer++;
    }else if(type == 'data'){
        state.data[declarator] = state.free_memory_pointer;
        for (var i = 0; i < bytes; i++) {
            state.memory[state.free_memory_pointer+i] = value.charAt(i);
        }
        state.free_memory_pointer+=bytes;
    }
}




function wipe_data(){
    for (let key in state.registers) {
        state.registers[key] = 0;
    }
    state.cs = {};
    state.data = {};
    state.labels = {};
    state.writable_memory = _writable_memory;
    state.free_memory_pointer = _free_memory_pointer;
}

