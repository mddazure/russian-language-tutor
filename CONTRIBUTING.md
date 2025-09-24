# Contributing to Russian Language Tutor

We love your input! We want to make contributing to Russian Language Tutor as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

When you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](https://github.com/your-username/russian-language-tutor/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-username/russian-language-tutor/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/russian-language-tutor.git
   cd russian-language-tutor
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Test Your Changes**
   - Test story generation with different levels and themes
   - Test comprehension and grammar questions
   - Test quiz functionality and scoring
   - Test on different screen sizes

## Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Define proper interfaces for data structures
- Use strict type checking
- Avoid `any` types when possible

### React
- Use functional components with hooks
- Use `useKV` for persistent data (GitHub Spark) or `useStorage` (Azure)
- Keep components focused and single-purpose
- Use proper error boundaries

### Styling
- Use Tailwind CSS for styling
- Follow the existing design system variables
- Use shadcn/ui components when possible
- Maintain responsive design principles

### Code Organization
- Keep related files close together
- Use descriptive file and variable names
- Add comments for complex logic
- Remove console.logs before committing

## Feature Requests

We welcome feature requests! Here are some areas where contributions would be especially valuable:

### Language Features
- Additional comprehension question types
- More grammar exercise formats
- Audio pronunciation integration
- Vocabulary building exercises

### User Experience
- Improved mobile interface
- Dark mode support
- Better accessibility features
- Offline functionality

### Technical Improvements
- Performance optimizations
- Better error handling
- Additional deployment options
- Testing framework integration

## Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clear, concise commit messages
   - Test thoroughly on both desktop and mobile
   - Follow the code style guidelines

3. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request on GitHub

4. **PR Review Process**
   - Maintainers will review your code
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

## Commit Message Guidelines

Use clear and meaningful commit messages:

- ✅ Good: `Add grammar question filtering by difficulty`
- ✅ Good: `Fix quiz scoring calculation bug`
- ✅ Good: `Improve mobile layout for story display`
- ❌ Bad: `fix bug`
- ❌ Bad: `update code`

## Testing

Currently, the project uses manual testing. We welcome contributions to add automated testing:

- Unit tests for utility functions
- Component tests for React components
- Integration tests for user flows
- E2E tests for critical paths

## Questions?

Don't hesitate to ask questions by:
- Opening a GitHub issue
- Starting a discussion in GitHub Discussions
- Reaching out to maintainers

Thanks for contributing! 🎉