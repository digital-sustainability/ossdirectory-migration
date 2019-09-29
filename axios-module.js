const axios = require('axios');
const backstream = require('./backstream');

require('dotenv').config();

const axiosclient = module.exports = {
  pipe : [],
  request : (action, param) => {
    axiosclient.pipe.push({action, param});
  },
  start : () => {
    if (axiosclient.pipe.length <= 0) return
    const { action, param } = axiosclient.pipe.shift();
    action(param).then(res => axiosclient.start()).catch(res => console.log(res));
  },
  send : (message) => {
    return axios.post(process.env.SLACK_TOKEN, {
      channel : process.env.SLACK_CHANNEL,
      username : "Migration-Bot",
      icon_emoji : ":robot_face:",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": message + ""
            }
          },
          {
            "type": "divider"
          },
          
        ]
      
    })
  },
  stats : () => {
    return axios.post("https://hooks.slack.com/services/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", {
      channel : "iot",
      username : "Migration-Bot",
      icon_emoji : ":squirrel:",
      "blocks" : [
      {
        "type": "section",
        "accessory": {
          "type": "image",
          "image_url": "https://minio.digisus.ch/neo4j/oss.png",
          "alt_text": "oss directory image"
        },
        "fields": [
          {
            "type": "plain_text",
            "text": "Created Nodes: ",
            "emoji": true
          },
          {
            "type": "plain_text",
            "text": backstream.stats.nodesCreated + "",
            "emoji": true
          },
          {
            "type": "plain_text",
            "text": "Created Relationsships: ",
            "emoji": true
          },
          {
            "type": "plain_text",
            "text": backstream.stats.relationshipsCreated + "",
            "emoji": true
          },
          {
            "type": "plain_text",
            "text": "Set Properities",
            "emoji": true
          },
          {
            "type": "plain_text",
            "text": backstream.stats.propertiesSet + "",
            "emoji": true
          },
          {
            "type": "plain_text",
            "text": "Added Labels",
            "emoji": true
          },
          {
            "type": "plain_text",
            "text": backstream.stats.labelsAdded + "",
            "emoji": true
          }
        ]
        }
      ]
    })
  },
  images : () => {

  }
}