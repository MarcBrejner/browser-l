class L1Visitor extends L0Visitor {  

    goto(node) {
        var reader = node.child(1);
        this._emitter.goto(node,reader)
    }
}

class L1Emitter extends L0Emitter{
    goto(node,reader){
        var reader1;
        if (reader.type === "label") {
            reader1 = new Content(CONTENT_TYPES.LABEL, reader.text);
        } else if (reader.type === "register") {
            reader1 = new Content(CONTENT_TYPES.REGISTER, reader.text);
        }
        var reader2 = new Content(CONTENT_TYPES.NUMBER, 1);
        var writer = new Content(CONTENT_TYPES.REGISTER, '$!');
        var expression = new Expression(CONTENT_TYPES.BIN_EXPRESSION, reader1, '-', reader2);
        this.assignment(node, true, writer, expression);
    }

}