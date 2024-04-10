/* global use, db */
// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use('amateras4');

// Search for documents in the current collection.
db.getCollection('poll')
  .updateOne(
    {
        id: '25812491229478913'
    },
    {
        $pull: {
            'options.$[].memberIdList': 'tesxt'  
        },
        $push: {
            'options.$[option].memberIdList': 'tesxt'  
        },
    },
    {
        arrayFilters: [
          {
            'option.id': '25985068409311233'
          }
        ]
    }
  )