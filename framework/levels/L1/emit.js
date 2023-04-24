function emit_l1(statement){
    if(statement.type == 'goto'){
        return ""; //L0 kode for goto
    }
    return statement.text;
}