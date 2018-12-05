const { Person, Class, driver, chai, expect, int } = require('../helper');

const getStats = function(results, has_delete = false) {
  return results[has_delete ? 2 : 1].summary.counters._stats
}

describe('Mongo4J Updating', () => {
  let neil;
  let session;

  beforeEach(() => {
    neil = new Person({
      firstName: "Neil",
      lastName: "Young",
      mongoSpecificValue1: "test",
      mongoSpecificValue2: "test",
      address: {
        city: "Brentwood",
        street: "Barleau St."
      }
    });

    session = driver.session();
  });

  afterEach(() => {
    session.close();
  })

  it('Update a simple value in Neo4J & Mongo', (done) => {

    neil.save().then((result) => {

      expect(result).to.not.be.null;
      expect(result).to.include(neil);
      expect(result).to.have.a.property('_id');
      expect(result).to.have.a.property('mongoSpecificValue1');
      expect(result).to.have.a.property('mongoSpecificValue2');
      expect(result).to.have.a.property('isNew', false);

      return result.updateNeo({firstName: 'Peter', lastName: 'Traverson'})

    }).then((results) => {
      const neo_stats = getStats(results);

      expect(neo_stats.propertiesSet).to.be.at.least(1);
      expect(results[0].ok).to.equal(1);

      return session.run('MATCH ' +
                         '(n:Person {m_id : {id} }) ' +
                         'RETURN n;', {id: neil._id.toString()})
    }).then((result) => {
      const properties = result.records[0]._fields[0].properties;

      expect(result).to.not.be.null;
      expect(result.records).to.be.lengthOf(1);
      expect(properties).to.not.have.a.property('mongoSpecificValue1');
      expect(properties).to.not.have.a.property('mongoSpecificValue2');
      expect(properties).to.have.a.property('m_id');
      expect(properties).to.have.a.property('first_name', 'Peter');
      expect(properties).to.not.have.a.property('first_name', 'Neil');
      expect(properties).to.have.a.property('last_name', 'Traverson');
      expect(properties).to.not.have.a.property('last_name', 'Young');

      done();

    });
  });

  it('Update subdoc as different node in neo4j', (done) => {

    neil.save().then((result) => {

      expect(result).to.not.be.null;
      expect(result).to.include(neil);
      expect(result).to.have.a.property('_id');
      expect(result).to.have.a.property('mongoSpecificValue1');
      expect(result).to.have.a.property('mongoSpecificValue2');
      expect(result).to.have.a.property('isNew', false);

      return result.updateNeo({
        firstName: 'Peter',
        lastName: 'Traverson',
        address: {
          city: "Brentwood",
          street: "Coyne St."
        }
      })

    }).then((results) => {
      const neo_stats = getStats(results);

      expect(neo_stats.propertiesSet).to.be.at.least(1);
      expect(results[0].ok).to.equal(1);

      return session.run('MATCH (n:Person {m_id : {id}})-[p]-(a:Address) RETURN a;', {id: neil._id.toString()});

    }).then((result) => {
      const properties = result.records[0]._fields[0].properties;

      expect(result).to.not.be.null;
      expect(result.records).to.be.lengthOf(1);
      expect(properties).to.have.a.property('m_id');
      expect(properties).to.have.a.property('city', 'Brentwood');
      expect(properties).to.have.a.property('street', 'Coyne St.');
      expect(properties).to.not.have.a.property('street', 'Barleau St.');

      done();

    });

  });

  it('Update multiple subdocs as different nodes in neo4j', (done) => {

    const chemistry = new Class({
      title: 'Chemistry',
      books: [{
        title: 'Organic Chemistry as a Second Language',
        author: 'David Klein'
      }, {
        title: 'Chemistry: A Molecular Approach',
        author: 'Nivaldo J. Tro'
      }]
    });

    const chemistry_update = {
      books: [{
        title: 'Uncle Tungsten',
        author: 'Oliver Sacks'
      }, {
        title: 'PiHKAL',
        author: 'Alexander Shulgin'
      }]
    }

    chemistry.save().then((result) => {

      expect(result).to.not.be.null;
      expect(result).to.have.a.property('_id');
      expect(result).to.have.a.property('isNew', false);
      expect(result.books).to.have.a.lengthOf(2);

      return result.updateNeo(chemistry_update);

    }).then((results) => {
      const neo_stats = getStats(results);

      expect(neo_stats.propertiesSet).to.be.at.least(1);
      expect(results[0].ok).to.equal(1);

      return session.run('MATCH (d:Book {m_id: {book_id}})-[pa]-(a:Class {m_id: {id}})-[pb]-(n:Book) RETURN d,n,a;', {id: chemistry._id.toString(), book_id: chemistry.books[0]._id.toString()});

    }).then((result) => {
      const properties = result.records[0]._fields[0].properties;
      const properties_second = result.records[0]._fields[1].properties;
      const properties_class = result.records[0]._fields[2].properties;

      expect(result).to.not.be.null;
      expect(result.records).to.be.lengthOf(1);
      expect(properties_class).to.have.a.property('title', 'Chemistry');
      expect(properties).to.have.a.property('m_id');
      expect(properties).to.have.a.property('title', 'Uncle Tungsten');
      expect(properties).to.not.have.a.property('title', 'Organic Chemistry as a Second Language');
      expect(properties).to.have.a.property('author', 'Oliver Sacks');
      expect(properties).to.not.have.a.property('author', 'David Klein');

      done();

    });

  });

  it('Update a document reference', (done) => {
    const daniel = new Person({firstName: "Daniel", lastName: "Durval"});

    neil.save().then((result) => {

      expect(result).to.not.be.null;
      expect(result).to.have.a.property('isNew', false);

      return daniel.save();

    }).then((result) => {

      expect(result).to.not.be.null;
      expect(result).to.include(daniel);
      expect(result).to.have.a.property('_id');
      expect(result).to.have.a.property('mongoSpecificValue1');
      expect(result).to.have.a.property('mongoSpecificValue2');
      expect(result).to.have.a.property('isNew', false);

      const chemistry = new Class({
        title: 'Chemistry',
        teacher: result._id
      })

      return chemistry.save();

    }).then((result) => {

      expect(result).to.not.be.null;
      expect(result).to.have.a.property('_id');
      expect(result).to.have.a.property('isNew', false);

      const chemistry_update = {
        teacher: daniel._id
      }

      return result.updateNeo(chemistry_update);

    }).then((results) => {
      const neo_del_stats = getStats(results, true);
      const neo_stats = getStats(results);

      expect(neo_stats.relationshipsCreated).to.equal(1);
      expect(neo_del_stats.relationshipsDeleted).to.equal(1);
      expect(results[0].ok).to.equal(1);

      return session.run('MATCH (n:Class)-[p]-(a:Person) RETURN n,p,a;');

    }).then((result) => {
      const properties_class = result.records[0]._fields[0].properties;
      const properties_person = result.records[0]._fields[2].properties;

      expect(result.records[0]._fields).to.have.a.lengthOf(3)
      expect(properties_class).to.not.be.null;
      expect(properties_person).to.have.property('m_id', daniel._id.toString());
      expect(properties_person).to.not.have.property('m_id', neil._id.toString());
      expect(properties_person).to.have.property('first_name', daniel.firstName);
      expect(properties_person).to.not.have.property('first_name', neil.firstName);
      expect(properties_person).to.have.property('last_name', daniel.lastName);
      expect(properties_person).to.not.have.property('last_name', neil.lastName);
      done();

    });

  });

  it('Update an array of document references', (done) => {
    const daniel = new Person({firstName: "Daniel", lastName: "Durval"});
    const henry = new Person({firstName: "Henry", lastName: "McCoverty"});
    const jason = new Person({firstName: "Jason", lastName: "Campbell"});

    Person.insertMany([daniel, neil, henry, jason]).then((result) => {

      expect(result).to.not.be.null;
      expect(result).to.have.a.lengthOf(4);
      expect(result).to.contain.something.with.a.property('firstName', neil.firstName);
      expect(result).to.contain.something.with.a.property('lastName', daniel.lastName);
      expect(result).to.contain.something.with.a.property('firstName', henry.firstName);
      expect(result).to.contain.something.with.a.property('lastName', jason.lastName);

      const chemistry = new Class({
        title: 'Chemistry',
        students: [daniel._id, neil._id]
      });

      return chemistry.save();

    }).then((result) => {

      expect(result).to.not.be.null;
      expect(result).to.have.a.property('_id');
      expect(result).to.have.a.property('isNew', false);
      expect(result.students).to.be.an('Array');
      expect(result.students).to.have.a.lengthOf(2);


      const chemistry_update = {
        students: [henry._id, jason._id]
      };

      return result.updateNeo(chemistry_update);

    }).then((results) => {
      const neo_del_stats = getStats(results, true);
      const neo_stats = getStats(results);

      expect(neo_stats.relationshipsCreated).to.equal(2);
      expect(neo_del_stats.relationshipsDeleted).to.equal(2);
      expect(results[0].ok).to.equal(1);

      done();
    });


  });

});
