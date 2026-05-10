import { fireEvent, render, screen } from "@testing-library/react";
import PostCard from "../PostCard";

const push = jest.fn();

jest.mock("next/router", () => ({
    useRouter: () => ({ push }),
}));

describe("PostCard", () => {
    beforeEach(() => {
        push.mockClear();
    });

    const post = {
        id: 42,
        first_name: "Ada",
        last_name: "Lovelace",
        avatar: "",
        created_at: "2026-05-10T10:00:00Z",
        privacy: "private",
        content: "Post card test content",
        image_url: "/uploads/post.gif",
    };

    test("renders author, privacy label, content, and image", () => {
        render(<PostCard post={post} />);

        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(screen.getByText("Private")).toBeInTheDocument();
        expect(screen.getByText("Post card test content")).toBeInTheDocument();
        expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("src", "/uploads/post.gif");
    });

    test("navigates to the post from card and action button", () => {
        render(<PostCard post={post} />);

        fireEvent.click(screen.getByText("Post card test content"));
        expect(push).toHaveBeenCalledWith("/post/42");

        fireEvent.click(screen.getByRole("button"));
        expect(push).toHaveBeenCalledWith("/post/42");
    });
});
