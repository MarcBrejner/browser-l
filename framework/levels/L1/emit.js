(function (statement){
    if (statement.childCount === 0)  {
        SourceCodeBuilder.addStatement(statement.text);
        return;
    }
    if (statement.child(0).type == 'goto'){
        SourceCodeBuilder.addStatement(`$! ?= ${statement.child(1).text} - 1;`)
    }
    SourceCodeBuilder.addStatement(statement.text);
})