async function p_source(tree){
    if(tree.rootNode.toString().includes("ERROR")){
        //console.log("Syntax Error, see parse below:");
        //console.log(tree.rootNode.toString());
        return "";
    }
    const declarations = tree.rootNode.childCount > 1 ? tree.rootNode.child(0) : [];
    const statements = tree.rootNode.childCount > 1 ? tree.rootNode.child(1) : tree.rootNode.child(0);
    
    return await p_declarations(declarations)+await p_statements(statements);
}

async function p_declarations(declarations){
    let p_declarations = "";
    if(declarations == []){
        return p_declarations;
    }
    for(let c_i = 0; c_i < declarations.childCount; c_i++){
        let declaration = declarations.child(c_i);
        switch(declaration.type){
            case 'declaration':
                p_declarations += await p_declaration(declaration);
                break;
            case ';':
                p_declarations += declaration.text;
                break;
            case '\n':
                p_declarations += declaration.text;
                break;
        }
    }
    return p_declarations;     
}

async function p_declaration(declaration){
    let type = declaration.child(0).text;
    let dec = declaration.child(1).text.split(' ');
    if(type == 'const'){
        return ".const "+dec[0]+" "+dec[1];
    }else if(type == 'data'){
        return ".data "+dec[0]+" "+dec[1];
    }
}

async function p_statements(statements){
    let p_statements = "";

    for(let c_i = 0; c_i < statements.childCount; c_i++){
        let statement = statements.child(c_i);
        switch(statement.type){
            case 'label':
                p_statements += statement.text+'\n';
                break;
            case 'statement':
                p_statements += await p_statement(statement);
                break;
            case ';':
                p_statements += statement.text;
                break;
            case '\n':
                p_statements += statement.text;
                break;
        }
    }
    return p_statements;
}

async function p_statement(statement){
    if(statement.text == 'syscall'){
        return statement.text;
    }else{
        return await p_assignment(statement)
    }
}

async function p_assignment(statement){
    return statement.child(0).text+" "+statement.child(1).text+" "+await p_expression(statement.child(2));
}

async function p_expression(expression){
    var numOfChildren = expression.childCount;
    if(numOfChildren > 2){
        return expression.child(0).text+" "+expression.child(1).text+" "+expression.child(2).text;
    }else{
        return expression.text;
    }
}