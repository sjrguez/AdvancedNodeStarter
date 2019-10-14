const Mongoose = require('mongoose');
const redis = require('redis')
const util = require('util')

const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl)
client.get = util.promisify(client.get)
const exec = Mongoose.Query.prototype.exec;



Mongoose.Query.prototype.cache = function( options = {} ) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || 'default' )
    return this;
}


Mongoose.Query.prototype.exec = async function () {
    
    if(!this.useCache) return exec.apply(this, arguments)
    
    const key = JSON.stringify( Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
    }) )
    console.log(key);
    
    
    // Ver si hay algun valor con esa 'key' en redis
    const cacheValue = await client.hget(key)

    // si hay un  valor
    if(cacheValue) {
        const doc = JSON.parse(cacheValue)

        return Array.isArray(doc)
            ? doc.map(d => this.model(d))
            : this.model(doc)
    }
    
    // De lo contrario ejecutra la query y guarda el resultado en redis
    const result = await exec.apply(this, arguments);
    client.hset(key,  JSON.stringify(result), 'EX', 10);
    return result
    
}