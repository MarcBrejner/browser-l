function emit_l2(statement){
    if (statement.childCount === 0) return emit_l1(statement);
    if (statement.child(0).type == 'VLAD'){
        return `goto ${statement.child(1).text};`; //L0 kode for goto
    }
    return emit_l1(statement);
}