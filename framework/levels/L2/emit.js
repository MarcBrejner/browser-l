(function (statement){
    if (statement.childCount === 0) return statement.text;

    if (statement.child(0).type == 'L2TEST'){
        return `goto ${statement.child(1).text}`; //L0 kode for goto
    }
    
    return statement.text;
})

