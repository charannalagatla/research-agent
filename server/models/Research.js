const mongoose = require('mongoose');
// mongoose is an ODM (Object Document Mapper)
// it lets you define a schema for your MongoDB documents
// think of it like: schema = the shape of data you expect to store

const ResearchSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true
    // every saved session must have a topic — no point storing without it
  },
  sources: [
    {
      source: String,  // site name e.g. "IBM"
      url: String,     // full URL
      insights: String // bullet points the LLM extracted
    }
  ],
  report: {
    type: String,
    required: true
    // the final synthesized report — this is what users come back to read
  },
  createdAt: {
    type: Date,
    default: Date.now
    // automatically set to current time when document is created
    // no need to manually pass this when saving
  }
});

module.exports = mongoose.model('Research', ResearchSchema);
// 'Research' = the model name
// mongoose will automatically create a collection called 'researches' in MongoDB