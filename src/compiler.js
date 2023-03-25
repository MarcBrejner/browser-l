function compile_assign(statement, l_pc, assign_type){
    var writer = statement.child(0).text;
    var assign_type = statement.child(1);
    var expression = statement.child(2);
    var numOfChildren = expression.childCount;
    
    switch(numOfChildren){
        case 1: // reader
            var op = assign_type === ":=" ? OP.ASSIGN : OP.COND;
            var reader = expression.child(0).text;
            return [op, l_pc, [writer, reader]];
        case 2: // oper, reader
            var op = assign_type === ":=" ? OP.ASSIGN_UN : OP.COND_UN;
            var reader = expression.child(1).text;
            var opr = expression.child(0).text;
            return [op, l_pc, [writer, opr, reader]];
        case 3: // reader, oper, reader
            var op = assign_type === ":=" ? OP.ASSIGN_BIN : OP.COND_BIN;
            var reader1 = expression.child(0).text;
            var opr = expression.child(1).text;
            var reader2 = expression.child(2).text;
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

