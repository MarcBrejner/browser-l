labels = {}
cs = {}
data = {}
registers = {
    "$!":0, //PC
    "$?":0, //Bool
    "$x":0,
    "$y":0,
    "$j":0
}

async function get_reader_type(reader){
    if(reader.child(0).type == 'assign' || reader.child(0).type == 'datavar'){
        return reader.child(0).child(0).type;
    } else {
        return reader.child(0).type;
    }
}

async function handle_reader(reader){
    var reader_content = reader.text;
    var reader_type = await get_reader_type(reader);
    switch(reader_type){
        case 'register':
            if (reader_content in registers){
                return registers[reader_content];
            }else{
                throw new Error("Register ",reader_content," not found")
            }
        case 'memory':
            break;//not done
        case 'constant':
            if (reader_content in cs){
                return parseInt(cs[reader_content]);
            }else{
                throw new Error("Constant ",reader_content," not found")
            }
        case 'data':
            if (reader_content in data){
                return data[reader_content];
            }else{
                throw new Error("Data ",reader_content," not found")
            }
        case 'label':
            if (reader_content in labels){
                return labels[reader_content];
            }else{
                throw new Error("Label ",reader_content," not found")
            }
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

async function handle_unary(oper,v){
    switch(oper.text){
        case '-':
            return -v;
        case '&':
            return 0; //Not implemented
    }
}

async function handle_expression(expression){
    var numOfChildren = expression.childCount;
    switch(numOfChildren){
        case 1: // reader
            return await handle_reader(expression.child(0));
        case 2: // oper, reader
            return await handle_unary(expression.child(0),await handle_reader(expression.child(1)));
        case 3: // reader, oper, reader
            return await handle_binary(await handle_reader(expression.child(0)), expression.child(1), await handle_reader(expression.child(2)))
    }
}

async function handle_writer(statement){
    var writer = statement.child(0).child(0).child(0);
    var expression = statement.child(2); 
    switch(writer.type){
        case 'memory':
            break;
        case 'register':
            registers[writer.text.toString()] = await handle_expression(expression);
    }
}

async function handle_syscall(s){
    return 0;
}

async function handle_statement(statement){
    if(statement.childCount == 1 && statement.text == 'syscall'){
        await handle_syscall(statement.child(0));
    }else{
        if(statement.child(1).type.toString() == ':='){
            await handle_writer(statement);
        }else if(statement.child(1).type.toString() == '?='){
            if(registers['$?']){//TODO: FIX 
                await handle_writer(statement);
            }
        }
    }
}


async function read_statements(statements){
    let instructions = new Array();
    let l_pc = 0;
    for(let c_i = 0; c_i < statements.childCount; c_i++){
        let statement = statements.child(c_i);
        switch(statement.type){
            case 'label':
                labels[statement.text] = l_pc;
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

async function handle_declaration(declaration){
    let type = declaration.child(0).text;
    let dec = declaration.child(1).text.split(' ');
    if(type == 'const'){
        cs[dec[0]] = dec[1];
    }else if(type == 'data'){
        data[dec[0]] = dec[1];
    }
}

async function read_declarations(declarations){
    for(let c_i = 0; c_i < declarations.childCount; c_i++){
        let declaration = declarations.child(c_i);
        switch(declaration.type){
            case 'declaration':
                await handle_declaration(declaration);
                break;
            case ';':
                break;
            case ' ':
                break;
        }
    }               
}

async function wipe_data(){
    for (let key in registers) {
        registers[key] = 0;
    }
}

async function read_program(tree){
    await wipe_data();
    if(tree.rootNode.toString().includes("ERROR")){
        console.log("Syntax Error, see parse below:");
        console.log(tree.rootNode.toString());
        return;
    }
    const declarations = tree.rootNode.childCount > 1 ? tree.rootNode.child(0) : [];
    const statements = tree.rootNode.childCount > 1 ? tree.rootNode.child(1) : tree.rootNode.child(0);
    await  read_declarations(declarations)
    let instructions = await read_statements(statements);
    return instructions;
}

async function execute_all(instructions){
    while(true){ //step
        await handle_statement(instructions[registers['$!']]);
    
        registers['$!']++;
        if(registers['$!'] >= instructions.length){
            break;
        }
    }
    console.log("registers: ",JSON.stringify(await registers, undefined, 2)); 
    console.log("labels: ",JSON.stringify(await labels, undefined, 2))
    console.log("conts: ",JSON.stringify(await cs, undefined, 2))
    console.log("data: ",JSON.stringify(await data, undefined, 2))
}

async function execute_step(instructions){
        if(registers['$!'] >= instructions.length){
            console.log("EOF");
            return -1;
        }
        await handle_statement(instructions[registers['$!']])
        registers['$!']++;
        console.log("registers: ",JSON.stringify(registers, undefined, 2)); 
        console.log("labels: ",JSON.stringify(labels, undefined, 2))
}

