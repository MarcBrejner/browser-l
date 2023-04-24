function emit_l1(statement){
    if (statement.childCount === 0) return emit_l0(statement);
    if(statement.child(0).type == 'goto'){
        return `$! ?= ${statement.child(1).text} - 1;`; //L0 kode for goto
    }
    return emit_l0(statement);
}