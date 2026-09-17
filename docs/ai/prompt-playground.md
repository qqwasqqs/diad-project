Please help me create the ticket description for the connection process between the current Next.js application and Splunk. This process consists of two parts:

**Part 1: Splunk Endpoint Testing**
The Splunk team needs to test the endpoints using cURL commands, following the provided documentation to send the specified parameters and verify the results. We expect them to include the fields we are sending and return them as metadata. Specifically, they should return filter fields such as time range, business units, and others as detailed in the documentation. 

Additionally, please include a brief explanation of how Splunk can create these endpoints and utilize parameters in saved queries, including a link to the relevant documentation. Please also provide a brief explanation and a documentation link regarding how they can return fields as metadata.

**Part 2: Field Mapping**
We will proceed to mapping the fields returned from Splunk to our internal objects within the Next.js application. We are currently using the old schemas for our documentation, but we have been instructed to map fields based on the new OTEL schemas. Hugo will provide a document outlining the matching between the old and new fields. 

Note that these two stages do not depend on one another and can be worked on accordingly.
Add the new created task in the `tasks` folder, in a new markdown file.

