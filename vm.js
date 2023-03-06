var state = {
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
    memory: new Array(10000)
}

var program = [];

function get_reader_type(reader){
    if(reader.child(0).type == 'assign' || reader.child(0).type == 'datavar'){
        return reader.child(0).child(0).type;
    } else {
        return reader.child(0).type;
    }
}

function handle_reader(reader){
    var reader_content = reader.text;
    var reader_type = get_reader_type(reader);
    switch(reader_type){
        case 'register':
            if (reader_content in state.registers){
                return state.registers[reader_content];
            }
            throw new Error("Register ",reader_content," not found");
        case 'memory':
            var startIndex = state.registers[reader.child(0).child(0).child(1).text];
            var stopIndex = startIndex + parseInt(reader.child(0).child(0).child(3).text);
            var result = "";
            if (stopIndex < state.memory.length) {
                for (var i = startIndex; i < stopIndex; i++) {
                    result += state.memory[i];
                }
                return result;        
            }
            throw new Error("Memory out of bounds");
        case 'constant':
            if (reader_content in state.cs){
                return parseInt(state.cs[reader_content]);
            }
            throw new Error("Constant ",reader_content," not found");
        case 'data':
            if (reader_content in state.data){
                return state.data[reader_content];
            }
            throw new Error("Data ",reader_content," not found")
        case 'label':
            if (reader_content in state.labels){
                return state.labels[reader_content];
            }
            throw new Error("Label ",reader_content," not found")
        case 'number':
            return parseInt(reader_content);
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
            if (!isNaN(is_number)) {
                state.memory[state.registers[register]] = expression_result;
                return;
            }
            var startIndex = state.registers[register];
            if (startIndex + bytes < state.memory.length) {
                for (var i = 0; i < bytes; i++) {
                    state.memory[i+startIndex] = expression_result.charAt(i);
                }      
            }
            break;
        case 'register':
            state.registers[writer.text.toString()] = handle_expression(expression);
            break;
    }
}

function handle_syscall(){
    return 0;
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


function read_statements(statements){
    let instructions = new Array();
    let l_pc = 0;
    for(let c_i = 0; c_i < statements.childCount; c_i++){
        let statement = statements.child(c_i);
        switch(statement.type){
            case 'label':
                state.labels[statement.text] = l_pc;
                break;
            case 'statement':
                instructions.push(statement);
                l_pc++;
                break;
            case ';':
                break;
            case ' ':
                break;
        }
    }
    
    return instructions;
}

function handle_declaration(declaration){
    let type = declaration.child(0).text;
    let dec = declaration.child(1).text.split(' ');
    if(type == 'const'){
        state.cs[dec[0]] = dec[1];
    }else if(type == 'data'){
        state.data[dec[0]] = dec[1];
    }
}

function read_declarations(declarations){
    for(let c_i = 0; c_i < declarations.childCount; c_i++){
        let declaration = declarations.child(c_i);
        switch(declaration.type){
            case 'declaration':
                handle_declaration(declaration);
                break;
            case ';':
                break;
            case ' ':
                break;
        }
    }               
}

function wipe_data(){
    for (let key in state.registers) {
        state.registers[key] = 0;
    }
}

function read_program(tree){
    wipe_data();
    if(tree.rootNode.toString().includes("ERROR")){
        console.log("Syntax Error, see parse below:");
        console.log(tree.rootNode.toString());
        return;
    }
    const declarations = tree.rootNode.childCount > 1 ? tree.rootNode.child(0) : [];
    const statements = tree.rootNode.childCount > 1 ? tree.rootNode.child(1) : tree.rootNode.child(0);
    read_declarations(declarations)
    program = read_statements(statements);
}

