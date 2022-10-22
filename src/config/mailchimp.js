const client = require("@mailchimp/mailchimp_marketing");

client.setConfig({
  apiKey: "7090814d3884bce6b36349642ccdedc2",
  server: "us14",
});

const addUserToMailingList = async (username, recipientEmail) => {
  try {
  const response = await client.lists.addListMember("624193946a", {
    email_address: recipientEmail,
    status: "subscribed",
    merge_fields: {
      FNAME: username,
      LNAME: "",
    },
  });
  return true
} catch{ex}{
  console.error(ex)
  return false
}
};

module.exports = addUserToMailingList