function get_reader_type(reader){
    if(reader.child(0).type == 'assign' || reader.child(0).type == 'datavar'){
        return reader.child(0).child(0).type;
    } else {
        return reader.child(0).type;
    }
}

function compile_reader(reader_node){
    let reader_id = reader_node.text;
    let reader_type = get_reader_type(reader_node);
    switch(reader_type){
        case 'register':
            return new reader(RT.REGISTER, reader_id);
        case 'memory':
            return new reader(RT.MEMORY, reader_id);
        case 'constant':
            return new reader(RT.CONSTANT, reader_id);
        case 'data':
            return new reader(RT.DATA, reader_id);
        case 'label':
            return new reader(RT.LABEL, reader_id);
        case 'number':
            //the number that the reader holds, is the id in this case
            return new reader(RT.NUMBER, parseInt(reader_id));
    }
}

function compile_writer(statement){
    let writer_node = statement.child(0).child(0).child(0);
    let writer_id = writer_node.text;
    switch(writer_node.type){
        case 'memory':
            return new writer(WT.MEMORY, writer_id)
        case 'register':
            return new writer(WT.REGISTER, writer_id)
    }
}



function compile_assign(statement, l_pc, assign_type){
    var writer = compile_writer(statement);
    var assign_type = statement.child(1).text;
    var expression = statement.child(2);
    var numOfChildren = expression.childCount;
    
    switch(numOfChildren){
        case 1: // reader
            var op = assign_type === ":=" ? OP.ASSIGN : OP.COND;
            var reader = compile_reader(expression.child(0));
            return [op, l_pc, [writer, reader]];
        case 2: // oper, reader
            var op = assign_type === ":=" ? OP.ASSIGN_UN : OP.COND_UN;
            var reader = compile_reader(expression.child(1));
            var opr = expression.child(0).text;
            return [op, l_pc, [writer, opr, reader]];
        case 3: // reader, oper, reader
            var op = assign_type === ":=" ? OP.ASSIGN_BIN : OP.COND_BIN;
            var reader1 = compile_reader(expression.child(0));
            var opr = expression.child(1).text;
            var reader2 = compile_reader(expression.child(2));
            return [op, l_pc, [writer, reader1, opr, reader2]];
    }
}

function compile_statement(statement, l_pc){
    if(statement.childCount == 1 && statement.text == 'syscall'){
        return [OP.SYSCALL,l_pc];
    }else{
        return compile_assign(statement, l_pc, "assign")
    }
}

function read_statements(statements){
    let instructions = new Array();
    let l_pc = 0;
    for(let c_i = 0; c_i < statements.childCount; c_i++){
        let statement = statements.child(c_i);
        let line_number = parseInt(statement.startPosition.row);

        switch(statement.type){
            case 'label':
                instructions.push([OP.LABEL, line_number, [statement.text, l_pc]])
                break;
            case 'statement':
                var bytecode = compile_statement(statement, line_number)
                instructions.push(bytecode);
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

function read_program(tree){
    // wipe_data();
    if(tree.rootNode.toString().includes("ERROR")){
        console.log("Syntax Error, see parse below:");
        console.log(tree.rootNode.toString());
        return;
    }
    const declarations = tree.rootNode.childCount > 1 ? tree.rootNode.child(0) : [];
    const statements = tree.rootNode.childCount > 1 ? tree.rootNode.child(1) : tree.rootNode.child(0);
    //read_declarations(declarations)
    let program = read_statements(statements);
    return program;
}

