class L1Builder extends L0Builder {
    handle(node) {
        if (node.type === "goto") {
            this.goto(node)
        } else {
            return super.handle(node);
        }
    }

    goto(node) {
        var reader = node.child(1);
        var reader1;
        if (reader.type === "label") {
            reader1 = new Content(CONTENT_TYPES.LABEL, reader.text);
        } else if (reader.type === "register") {
            reader1 = new Content(CONTENT_TYPES.REGISTER, reader.text);
        }
        var reader2 = new Content(CONTENT_TYPES.NUMBER, 1);
        var writer = new Content(CONTENT_TYPES.REGISTER, '$!');
        var expression = new Expression(CONTENT_TYPES.BIN_EXPRESSION, reader1, '-', reader2);
        this.assign(node, true, writer, expression);
    }
}