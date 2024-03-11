import { styled } from "@mui/material/styles";
import { Fab } from "@mui/material";

export const StyledFab = styled(Fab)(({ theme, color = "primary" }) => ({
  // color: 'white',
  // backgroundColor: theme.palette[color].main,
  background: "#469DBB",
  color: "#fff",
  borderRadius: 0,
  variant: "extended",
  "&:hover": {
    // backgroundColor: theme.palette[color].main,
    backgroundColor: "#2398c1",
    color: "#fff",
    backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`,
  },
}));
