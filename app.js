/*
  A simple script to scrape all the questions from a Google Form.
  Created:
    By -> https://github.com/khetrapalaksh4y
    On -> 22 April, 2017

  Updated:
    By -> https://github.com/iamtalhaasghar
    On -> 5 Jan 2020
*/


const request = require('request');
const express = require('express');
const q = require('q');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./config/carbide-server-280316-c7750ec72a4d.json');
const doc = new GoogleSpreadsheet('1xdQu-KEOFdqIz2HGhuzghYUyQan-qFLNCEo2i4nQVew');

const app = express();
const http = require('http').Server(app);

http.listen(5500, (err) => {
    if (err) {
        console.log(err);
    }
    console.log('Listening to http://localhost:' + 5500);
})

app.get('/', (request, response) => {
    response.status(200).send('bar');
})

app.get('/scrape/:form_id', (request, response) => {
    scrapeGoogleFormForQuestions(request.params.form_id).then((questions) => {
        response.status(200).json(questions);
    }).catch((error) => {
        response.status(500).json(error);
    })
})

async function scrapeGoogleFormForQuestions(form_id) {
    await doc.useServiceAccountAuth(creds);
    const promise = q.defer();
    /*
      GOOGLE FORMS' LINKS NOW HAVE FOLLOWING URL STRUCTURE:
      https://docs.google.com/forms/d/e/<form_id>/viewform
    */
    request("https://docs.google.com/forms/d/e/" + form_id + "/viewform", (error, response, body) => {
        if (error) {
            promise.reject("Something went wrong");
        }
        else {
            var questions = extractQuestionsFromBody(body);
            if(questions)
            {
                promise.resolve(questions);
            }
            else
            {
                promise.reject("Ah! I couldn't find the questions. Please make sure the link you shared is valid and you can access atleast one question on it.");
            }
        }
    })

    return promise.promise;
}

function extractQuestionsFromBody(htmlString) {
    var html = cheerio.load(htmlString);
    /*
      The css class of <span> containing google form question has changed from
      "freebirdAnalyticsViewQuestionTitle" to "freebirdFormviewerComponentsQuestionBaseTitle"
    */
    var questionSelectors = html(".freebirdFormviewerComponentsQuestionBaseTitle");
    if(!questionSelectors.length)
    {
        return false;
    }
    else
    {
        return extractQuestionsFromQuestionSelectors(questionSelectors);
    }
}

async function extractQuestionsFromQuestionSelectors(questionSelectors) {
    var questions = [];
    const sheet = await doc.addSheet({ headerValues: ['Question'] });
    questionSelectors.each(async function(index, question) {
        await sheet.addRow({Question : question.children[0].data});
        questions.push(question.children[0].data);
    })
    return questions;
}
