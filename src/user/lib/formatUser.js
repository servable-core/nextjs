export default (object) => {
    return {
        ...object,
        get: (id) => object[id]
    }

} 