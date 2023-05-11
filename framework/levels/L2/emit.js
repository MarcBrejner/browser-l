(function (statement){
    if (statement.childCount === 0)  {
        SourceCodeBuilder.addStatement(statement.text);
        return;
    }

    var variablePrefix = "_";
    if (statement.child(0).type == 'variable_name'){
        var variableName = variablePrefix + statement.child(0).text;
        var variableType = statement.child(2).text;
        variables.variableTypes[variableName] = variableType;
        var variableSize = parseInt(variableType.replace(/\D/g, ''));
        var memory_allocation = "";
        for (var i = 0; i < variableSize/8; i++) {
            memory_allocation += "0";
        }
        var dataCode = `data &${variableName} "${memory_allocation}";\n`;
        var assign = `$n:=&${variableName};\n`;
        SourceCodeBuilder.addDeclaration(dataCode);
        SourceCodeBuilder.addStatement(assign);
        if (!statement.child(4).toString().includes('variable_name')) { 
            expr = `[$n,${variableType}]:=${statement.child(4).text};\n`;
            SourceCodeBuilder.addStatement(expr);
        } else {
            buildExpressionWithVariable(statement, 2);
        }
        
        return;
    }
    
    
    if (statement.childCount >= 3) {
        if (statement.child(2).toString().includes('variable_name')) {
           buildExpressionWithVariable(statement, 0)
           return;
        }     
    }

    SourceCodeBuilder.addStatement(statement.text);

    function buildExpressionWithVariable(statement, childOffset) {
        var binaryExpression = statement.child(2 + childOffset).childCount === 3;
        var reader1 = statement.child(2 + childOffset).child(0).child(0);
        var reader2 = binaryExpression ? statement.child(2 + childOffset).child(2).child(0) : null;
        var reader1Name = variablePrefix + reader1.text;
        var reader2Name = reader2 == null ? "" : variablePrefix + reader2.text;
        var expression = statement.child(2 + childOffset);
        // L2: $x := f + g
        // L0: 
        // $n := &f;
        // $m := &g;
        // $x := [$n, u8] + [$m,u32]
        if (binaryExpression && reader1.type === 'variable_name' && reader2.type === 'variable_name') {
            SourceCodeBuilder.addStatement(`$n:=&${reader1Name};\n`);
            SourceCodeBuilder.addStatement(`$m:=&${reader2Name};\n`);
            SourceCodeBuilder.addStatement(`${statement.child(0).text}:=[$n,${variables.variableTypes[reader1Name]}] ${expression.child(1).text} [$m,${variables.variableTypes[reader2Name]}];\n`);
        } 
        // L2: $x := f + 5
        // L0: 
        // $n := &f;
        // $x := [$n, u8] + 5
        else if (binaryExpression && reader1.type === 'variable_name') {
            SourceCodeBuilder.addStatement(`$n:=&${reader1Name};\n`);
            SourceCodeBuilder.addStatement(`${statement.child(0).text}:=[$n,${variables.variableTypes[reader1Name]}] ${expression.child(1).text} ${expression.child(2).text};\n`);
        }

        // L2: $x := 5 + g
        // L0: 
        // $n := &g;
        // $x := 5 + [$n, u8] 
        else if (binaryExpression && reader2.type === 'variable_name') {
            SourceCodeBuilder.addStatement(`$n:=&${reader2Name};\n`);
            SourceCodeBuilder.addStatement(`${statement.child(0).text}:=${expression.child(0).text} ${expression.child(1).text} [$n,${variables.variableTypes[reader2Name]}];\n`);
        }

        // L2: $x := g
        // L0: 
        // $n := &g;
        // $x := [$n, u8] 
        else if (!binaryExpression) {
            SourceCodeBuilder.addStatement(`$n:=&${reader1Name};\n`);
            SourceCodeBuilder.addStatement(`${statement.child(0).text}:=[$n,${variables.variableTypes[reader1Name]}];\n`);
        }
    }
})
