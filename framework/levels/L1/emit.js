(function (statement){
    if (statement.childCount === 0) return statement.text;
    if (statement.child(0).type == 'goto'){
        return `$! ?= ${statement.child(1).text} - 1;`; //L0 kode for goto
    }
    return statement.text;
})