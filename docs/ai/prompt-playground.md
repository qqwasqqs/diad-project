# Playground

I want to write an email to my colleagues about the hand-over documentation for the dashboards we created. I will send the email myself. But, I need you to write the content. I will also attach the relevant documentation files from the `docs/hand-over` directory.
The content should refer to the following:
- A short status description of the current connection between the dashboards and Splunk
- A short description of the attached files
- Some PRs that should be merged next
- Suggestions about the next steps

## Status of the current connection
Here I want to say that the code the connects the Product Owner dashboard and the report Splunk service is working. I also want to mention that it reads data from 2 sources. Also have to mention the env variable `DASHBOARD_DATA_SOURCE` that controls which source is used. And that when I requested data from Splunk, I got an HTML response format, not JSON, on the `postSplunkQuery` function.

## Attached files
Here you will add that short description of the hand over files.

## Next PRs to merge
Raluca made 2 PRs. One contains the connection of the Tech Team dashboard to the report Splunk service and the other one contains the caching system for Splunk requests. They should be merged in a specific order. First, the connection, then the caching system.

## Suggested next steps
- Review and Merge the PRs in the specified order.
- Test the caching system to ensure it works as expected.
- Update the hand-over documentation to reflect the new connections and caching system.
- Technical debt files.
- Plan the integration of the remaining dashboards with the Splunk service.