const query = "Renegade Acro Acrobat";
apiKey = "3085e85f6d2f400dba636d3bc977e728f260967a4feeda2e4586039ffab9fd56";
const url = `https://serpapi.com/search.json?q=${query}&api_key=${apiKey}`;

const request = fetch(url)
  .then((data) => {
    return data.json();
  })
  .then((res) => {
    console.log(res);
  });
