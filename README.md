# Playmove

A basic Sui Move Playground for trying out code in the browser.

## Structure

The project consists of two parts:

1. A [web service](./crates/api/) that builds/tests the move code
2. The [web components](/web/)

There's a react component that can be used to render playgrounds in your website.
This is mainly useful for documentation pages!


## Running the API

Run this on the root to create the docker image:
```
docker build -f docker/api/Dockerfile -t moveplay-api .
```

Then you can run (and replace it) like:
```
docker rm -f moveplay-api 2>/dev/null && docker run -d --name moveplay-api -p 8181:8181 moveplay-api
```

## Todos

- [x] Create a proper deployment docker image
- [ ] Figure out how to warm up git cache & update SUI binary when releases are made
- [ ] Add metrics
- [ ] Create a "gist"-based sharing/import of links
