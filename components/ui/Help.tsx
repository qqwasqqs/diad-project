/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script defines the `Help` component that displays additional information to users.
    - The component uses Fluent UI's `InfoLabel` component to render a tooltip-style label with an info icon.
    - It takes a `info` prop, which contains the text to be displayed inside the info label.
    - This component is used throughout the application to provide helpful context or additional details.
*/

//---------------------- Imports -------------------------//

import { InfoLabel, makeStyles, tokens } from "@fluentui/react-components"; // Importing Fluent UI components and styling tools
import { FC } from "react"; // Importing `FC` (Function Component) type from React for defining a functional component

//---------------------- Styling -------------------------//

/**
 * `useStyles` hook
 * 
 * This hook is used to define custom styles for the component using Fluent UI's `makeStyles`.
 * It applies the styles for the info icon inside the `Help` component to control the icon color.
 * 
 * @returns Object - Contains the styles for the `infoIcon`.
 */
const useStyles = makeStyles({
  infoIcon: {
    color: tokens.colorNeutralForeground1, // Setting the color for the info icon to neutral foreground color
  },
});

//---------------------- Type Definitions -------------------------//

/**
 * `HelpProps` Interface
 * 
 * Defines the shape of the props object passed to the `Help` component.
 * It contains the `info` property, which is a string that will be displayed inside the info label.
 */
interface HelpProps {
  info: string; // Text that will be displayed inside the InfoLabel
}

//---------------------- Component -------------------------//

/**
 * `Help` Component
 * 
 * This component displays a help label with an info button. It is used to show additional information or descriptions for the users.
 * The `info` prop contains the message to be displayed, and it appears when the info button is hovered or clicked.
 * 
 * @param info - A string containing the text that should be displayed in the info label.
 * 
 * @returns JSX.Element - The JSX for rendering an `InfoLabel` component with the provided information.
 * 
 * Sample Input and Output:
 * Input:
 * ```tsx
 * <Help info="This is additional information." />
 * ```
 * Output:
 * ```html
 * <InfoLabel size="large" infoButton={...} info="This is additional information." />
 * ```
 */
export const Help: FC<HelpProps> = ({ info }) => {
  const styles = useStyles(); // Hook to get the custom styles for the component

  return (
    <InfoLabel
      size="large" // Sets the size of the InfoLabel
      infoButton={{
        className: styles.infoIcon, // Applying custom styles for the info icon button
      }}
      info={info} // The text to be displayed inside the InfoLabel
    />
  );
};
