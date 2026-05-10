import { render, screen } from "@testing-library/react";
import Avatar from "../Avatar";

describe("Avatar", () => {
    test("renders initial when no uploaded image is present", () => {
        render(<Avatar name="Alice Example" />);

        expect(screen.getByText("A")).toBeInTheDocument();
    });

    test("renders uploaded image through assetURL", () => {
        render(<Avatar url="/uploads/avatar.gif" name="Alice Example" />);

        expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("src", "/uploads/avatar.gif");
    });
});
